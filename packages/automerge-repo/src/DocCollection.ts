import EventEmitter from "eventemitter3"
import { v4 as uuid } from "uuid"
import { DocHandle } from "./DocHandle"
import { DocumentId } from "./types"

export class DocCollection extends EventEmitter<DocCollectionEvents<unknown>> {
  #handleCache: Record<DocumentId, DocHandle<unknown>> = {}

  constructor() {
    super()
  }

  /** Returns a handle  */
  #handleFromCache(
    /** The documentId of the handle to look up or create */
    documentId: DocumentId,

    /** If we know we're creating a new document, specify this so we can have access to it immediately */
    newDoc: boolean
  ) {
    // If we have the handle cached, return it
    if (this.#handleCache[documentId]) return this.#handleCache[documentId]

    // If not, create a new handle, cache it, and return it
    const handle = new DocHandle<unknown>(documentId, newDoc)
    this.#handleCache[documentId] = handle
    return handle
  }

  /** Returns all the handles we have cached. */
  get handles() {
    return this.#handleCache
  }

  /**
   * Creates a new document and returns a handle to it. The initial value of the document is
   * an empty object `{}`. Its documentId is generated by the system.
   */
  create<T>(): DocHandle<T> {
    // TODO: this should really insist on initial value of T
    // (but: we need to make sure the storage system will collect it)
    // (next: we need to have some kind of reify function)
    // (then: cambria!)

    const documentId = uuid() as DocumentId
    const handle = this.#handleFromCache(documentId, true) as DocHandle<T>
    this.emit("document", { handle })
    return handle
  }

  /**
   * Retrieves a document by id. It gets data from the local system, but also by emits a `document`
   * event, which a CollectionSynchronizer can use to advertise interest to other peers
   */
  find<T>(
    /** The documentId of the handle to retrieve */
    documentId: DocumentId
  ): DocHandle<T> {
    // TODO: we want a way to make sure we don't yield intermediate document states during initial synchronization

    // If we already have a handle, return it
    if (this.#handleCache[documentId])
      return this.#handleCache[documentId] as DocHandle<T>

    // Otherwise, create a new handle
    const handle = this.#handleFromCache(documentId, false)

    // we don't directly initialize a value here because the StorageSubsystem and Synchronizers go
    // and get the data asynchronously and block on read instead of on create

    // emit a document event to advertise interest in this document
    this.emit("document", { handle })

    return handle as DocHandle<T>
  }
}

// types

export interface DocCollectionEvents<T> {
  document: (arg: DocumentPayload<T>) => void
}

export interface DocumentPayload<T> {
  handle: DocHandle<T>
}
