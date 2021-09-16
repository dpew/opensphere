goog.module('os.im.action.cmd.FilterActionAdd');

const State = goog.require('os.command.State');
const AbstractFilterAction = goog.require('os.im.action.cmd.AbstractFilterAction');

const FilterActionEntry = goog.requireType('os.im.action.FilterActionEntry');


/**
 * Command for adding filter actions.
 */
class FilterActionAdd extends AbstractFilterAction {
  /**
   * Constructor.
   * @param {!FilterActionEntry} entry The filter action.
   * @param {number=} opt_index The index in the entry list.
   * @param {string=} opt_parentId The parent node ID.
   */
  constructor(entry, opt_index, opt_parentId) {
    super(entry, opt_index, opt_parentId);

    if (entry) {
      this.title = 'Add ' + this.entryTitle + ' "' + entry.getTitle() + '"';
    }
  }

  /**
   * @inheritDoc
   */
  execute() {
    if (this.canExecute()) {
      this.state = State.EXECUTING;

      this.add();
      this.state = State.SUCCESS;
      return true;
    }

    return false;
  }

  /**
   * @inheritDoc
   */
  revert() {
    this.state = State.REVERTING;

    this.remove();
    this.state = State.READY;
    return true;
  }
}

exports = FilterActionAdd;
