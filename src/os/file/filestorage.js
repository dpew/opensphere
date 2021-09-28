goog.declareModuleId('os.file.FileStorage');

import {FILE_DB_NAME, FILE_DB_VERSION, FILE_STORE_NAME} from '../os.js';
import AsyncStorageWrapper from '../storage/asyncstoragewrapper.js';
import IDBStorage from '../storage/idbstorage.js';
import ObjectMechanism from '../storage/objectmechanism.js';
import * as osFile from './index.js';

const Disposable = goog.require('goog.Disposable');
const Deferred = goog.require('goog.async.Deferred');
const dispose = goog.require('goog.dispose');
const log = goog.require('goog.log');
const path = goog.require('goog.string.path');

const Error = goog.requireType('goog.db.Error');
const Logger = goog.requireType('goog.log.Logger');
const {default: OSFile} = goog.requireType('os.file.File');
const {default: AsyncStorage} = goog.requireType('os.storage.AsyncStorage');


/**
 * Stores local files using IndexedDB when available, or a local cache if IDB is not supported.
 */
export default class FileStorage extends Disposable {
  /**
   * Constructor.
   * @param {string=} opt_dbName
   * @param {number=} opt_dbVersion
   */
  constructor(opt_dbName, opt_dbVersion) {
    super();
    this.log = logger;

    /**
     * Map of which files exist in storage so {@link FileStorage#fileExists} can be called synchronously.
     * @type {!Object<string, boolean>}
     * @private
     */
    this.files_ = {};

    /**
     * @type {AsyncStorage<!OSFile>}
     * @protected
     */
    this.storage = new IDBStorage(FILE_STORE_NAME, opt_dbName || FILE_DB_NAME,
        opt_dbVersion || FILE_DB_VERSION);
    this.storage.deserializeItem = osFile.deserializeFile;
    this.storage.serializeItem = osFile.serializeFile;

    this.storage.init().addCallbacks(this.onStorageReady_, this.onStorageError_, this);
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    dispose(this.storage);
    this.storage = null;
  }

  /**
   * Handle successful IndexedDB storage initialization.
   *
   * @private
   */
  onStorageReady_() {
    this.storage.getAll().addCallbacks(this.onFilesReady_, this.onStorageError_, this);
  }

  /**
   * Handle IndexedDB storage error, degrading to using local storage.
   *
   * @param {Error|string=} opt_error The error.
   * @private
   */
  onStorageError_(opt_error) {
    dispose(this.storage);
    this.storage = new AsyncStorageWrapper(new ObjectMechanism(), osFile.deserializeFile,
        osFile.serializeFile);
  }

  /**
   * Handle {@code getAll} success. Updates the cache of files stored in the database.
   *
   * @param {Array<OSFile>} files
   * @private
   */
  onFilesReady_(files) {
    for (var i = 0, n = files.length; i < n; i++) {
      var url = files[i].getUrl();
      if (url) {
        this.files_[url] = true;
      }
    }
  }

  /**
   * Clears all files from storage.
   *
   * @return {!Deferred} The deferred delete request.
   */
  clear() {
    return this.storage.clear().addCallback(this.onFilesCleared_, this);
  }

  /**
   * Deletes a file from storage.
   *
   * @param {!(OSFile|string)} file The file to delete.
   * @return {!Deferred} The deferred delete request.
   */
  deleteFile(file) {
    var fileKey = typeof file == 'string' ? file : file.getUrl();
    if (!fileKey) {
      var filename = typeof file == 'string' ? 'undefined' : file.getFileName();
      var error = new Deferred();
      error.errback('Unable delete a file (' + filename + ') with a null/empty url!');
      return error;
    }

    return this.storage.remove(fileKey).addCallback(goog.partial(this.onFileRemoved_, fileKey), this);
  }

  /**
   * Checks if a file exists in the database.
   *
   * @param {(string|OSFile)} file The file or path to look for
   * @return {boolean} If the file exists in storage.
   */
  fileExists(file) {
    var url = typeof file == 'string' ? file : file.getUrl();
    return !!url && this.files_[url] != null;
  }

  /**
   * Get a file from the database.
   *
   * @param {string} url
   * @return {!Deferred} The deferred store request.
   */
  getFile(url) {
    return this.storage.get(url);
  }

  /**
   * Get all files from the database.
   *
   * @return {!Deferred} The deferred store request.
   */
  getFiles() {
    return this.storage.getAll();
  }

  /**
   * If file storage is being persisted via IndexedDB.
   *
   * @return {boolean}
   */
  isPersistent() {
    return this.storage instanceof IDBStorage;
  }

  /**
   * Updates the provided file's name/url to a unique value (not currently in storage). If the name isn't already unique,
   * new names will be generated by converting 'base.ext' to 'base-(1..n).ext'.
   *
   * @param {!OSFile} file
   */
  setUniqueFileName(file) {
    // checking if it exists first also verifies it's a local file
    var name = file.getFileName();
    if (name && this.fileExists(file)) {
      var extension = path.extension(name);
      var baseName = name.replace(new RegExp('.' + extension + '$'), '');
      var i = 1;
      do {
        var newName = baseName + '-' + i++ + '.' + extension;
        file.setFileName(newName);
        file.setUrl(osFile.getLocalUrl(newName));
      } while (this.fileExists(file));
    }
  }

  /**
   * Stores a file in the database.
   *
   * @param {!OSFile} file
   * @param {boolean=} opt_replace If the file should be replaced in the store.
   * @return {!Deferred} The deferred store request.
   */
  storeFile(file, opt_replace) {
    var url = file.getUrl();
    if (!url) {
      var error = new Deferred();
      error.errback('Unable store a file (' + file.getFileName() + ') with a null/empty url!');
      return error;
    }

    return this.storage.set(url, file, opt_replace).addCallback(goog.partial(this.onFileStored_, url), this);
  }

  /**
   * Handle file stored successfully.
   *
   * @param {string} key The file key.
   * @private
   */
  onFileStored_(key) {
    if (key) {
      this.files_[key] = true;
    }
  }

  /**
   * Handle file removed successfully.
   *
   * @param {string} key The file key.
   * @private
   */
  onFileRemoved_(key) {
    if (key) {
      delete this.files_[key];
    }
  }

  /**
   * Handle files cleared.
   *
   * @private
   */
  onFilesCleared_() {
    this.files_ = {};
  }

  /**
   * Get the global instance.
   * @return {!FileStorage}
   */
  static getInstance() {
    if (!instance) {
      instance = new FileStorage();
    }

    return instance;
  }

  /**
   * Set the global instance.
   * @param {FileStorage} value
   */
  static setInstance(value) {
    instance = value;
  }
}

/**
 * Global instance.
 * @type {FileStorage|undefined}
 */
let instance;

/**
 * Logger
 * @type {Logger}
 */
const logger = log.getLogger('os.file.FileStorage');
