goog.module('os.record.IRecord');

const ITime = goog.requireType('os.time.ITime');


/**
 * A simple interface for describing a record
 *
 * @interface
 */
class IRecord {
  /**
   * Constructor.
   */
  constructor() {
    /**
     * The ID of the record
     * @type {string}
     */
    this.id;

    /**
     * The color of the record
     * @type {number}
     */
    this.color;

    /**
     * The time for the record
     * @type {ITime}
     */
    this.recordTime;
  }
}

exports = IRecord;
