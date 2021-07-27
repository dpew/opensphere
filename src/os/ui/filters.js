goog.module('os.ui.FiltersUI');
goog.module.declareLegacyNamespace();

goog.require('os.ui.AddFilterUI');
goog.require('os.ui.slick.slickTreeDirective');

const GoogEventType = goog.require('goog.events.EventType');
const {ROOT} = goog.require('os');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const CommandProcessor = goog.require('os.command.CommandProcessor');
const SequenceCommand = goog.require('os.command.SequenceCommand');
const FilterNode = goog.require('os.data.FilterNode');
const FilterTreeSearch = goog.require('os.data.FilterTreeSearch');
const SourceGroupBy = goog.require('os.data.groupby.SourceGroupBy');
const LayerEventType = goog.require('os.events.LayerEventType');
const {createFromFile} = goog.require('os.file');
const BaseFilterManager = goog.require('os.filter.BaseFilterManager');
const {getMapContainer} = goog.require('os.map.instance');
const Metrics = goog.require('os.metrics.Metrics');
const {Filters} = goog.require('os.metrics.keys');
const {launchQueryImport} = goog.require('os.query');
const {getFilterManager} = goog.require('os.query.instance');
const FilterLayerGroupBy = goog.require('os.ui.FilterLayerGroupBy');
const Module = goog.require('os.ui.Module');
const FilterEventType = goog.require('os.ui.filter.FilterEventType');
const FilterExportChoice = goog.require('os.ui.filter.ui.FilterExportChoice');
const FilterExportUI = goog.require('os.ui.filter.ui.FilterExportUI');
const {MENU} = goog.require('os.ui.menu.filter');
const CombinatorUI = goog.require('os.ui.query.CombinatorUI');
const FilterAdd = goog.require('os.ui.query.cmd.FilterAdd');
const FilterRemove = goog.require('os.ui.query.cmd.FilterRemove');
const AbstractGroupByTreeSearchCtrl = goog.require('os.ui.slick.AbstractGroupByTreeSearchCtrl');

const GoogEvent = goog.requireType('goog.events.Event');
const INodeGroupBy = goog.requireType('os.data.groupby.INodeGroupBy');
const PropertyChangeEvent = goog.requireType('os.events.PropertyChangeEvent');
const OSFile = goog.requireType('os.file.File');
const FilterEntry = goog.requireType('os.filter.FilterEntry');
const IFilterable = goog.requireType('os.filter.IFilterable');
const FilterEvent = goog.requireType('os.ui.filter.FilterEvent');
const SlickTreeNode = goog.requireType('os.ui.slick.SlickTreeNode');


/**
 * The filters window directive
 *
 * @return {angular.Directive}
 */
const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: true,
  templateUrl: ROOT + 'views/filters.html',
  controller: Controller,
  controllerAs: 'filtersCtrl'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
const directiveTag = 'filters';

/**
 * Add the directive to the module
 */
Module.directive(directiveTag, [directive]);

/**
 * Controller for Filters window
 * @unrestricted
 */
class Controller extends AbstractGroupByTreeSearchCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @ngInject
   */
  constructor($scope, $element) {
    super($scope, $element, 25);

    this.title = 'filters';
    try {
      this.scope['contextMenu'] = MENU;
    } catch (e) {
    }

    this.viewDefault = 'Layer Type';

    /**
     * Bound version of the drag-drop handler.
     * @type {Function}
     */
    this['onDrop'] = this.onDrop_.bind(this);

    /**
     * @type {?FilterTreeSearch}
     */
    this.treeSearch = new FilterTreeSearch('filters', this.scope);
    this.scope['views'] = Controller.VIEWS;
    this.init();

    $scope.$on('filterCopy', this.onCopyFilter_.bind(this));
    $scope.$on('filterEdit', this.onEditFilter_.bind(this));
    $scope.$on('filterComplete', this.onEditComplete_.bind(this));

    getFilterManager().listen(GoogEventType.PROPERTYCHANGE, this.searchIfAddedOrRemoved_, false, this);
    getFilterManager().listen(FilterEventType.FILTERS_REFRESH, this.search, false, this);
    getFilterManager().listen(FilterEventType.EXPORT_FILTER, this.export, false, this);

    var map = getMapContainer();
    map.listen(LayerEventType.ADD, this.search, false, this);
    map.listen(LayerEventType.REMOVE, this.search, false, this);
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    getFilterManager().unlisten(FilterEventType.EXPORT_FILTER, this.export, false, this);
    getFilterManager().unlisten(FilterEventType.FILTERS_REFRESH, this.search, false, this);
    getFilterManager().unlisten(GoogEventType.PROPERTYCHANGE, this.searchIfAddedOrRemoved_, false, this);
    var map = getMapContainer();
    map.unlisten(LayerEventType.ADD, this.search, false, this);
    map.unlisten(LayerEventType.REMOVE, this.search, false, this);
    super.disposeInternal();
  }

  /**
   * Launches the advanced combination window
   *
   * @export
   */
  launch() {
    CombinatorUI.launch();
    Metrics.getInstance().updateMetric(Filters.ADVANCED, 1);
  }

  /**
   * Pop up filter export gui
   *
   * @param {FilterEvent=} opt_event right click export event
   * @export
   */
  export(opt_event) {
    FilterExportUI.launchFilterExport(this.save_.bind(this));
  }

  /**
   * Disables export button
   *
   * @return {boolean}
   * @export
   */
  exportDisabled() {
    // off when no filters present
    var filters = getFilterManager().getFilters();
    if (filters && filters.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Save the filters to a file
   *
   * @param {string} name of the file
   * @param {FilterExportChoice} mode how to export filters
   * @private
   */
  save_(name, mode) {
    var filters = [];
    if (mode != FilterExportChoice.SELECTED) {
      this.flatten_(this.scope['filters'], filters,
          mode == FilterExportChoice.ACTIVE);
    } else if (this.scope['selected'] && this.scope['selected'].length) {
      filters = this.scope['selected'];
    } else if (this.scope['selected']) {
      filters = [this.scope['selected']];
    }

    // remove nodes that are not filters (e.g. the layer node in Group Type -> Layer Type)
    filters = filters.filter(function(f) {
      return f instanceof FilterNode;
    });

    FilterExportUI.exportFilters(name, filters);
  }

  /**
   * Get filters out of the tree
   *
   * @param {Array} arr The array of items
   * @param {Array} result The resulting flat array
   * @param {boolean} activeOnly get only the active filters
   * @private
   */
  flatten_(arr, result, activeOnly) {
    if (arr) {
      for (var i = 0, n = arr.length; i < n; i++) {
        var item = /** @type {SlickTreeNode} */ (arr[i]);
        if (item.getChildren()) {
          // parent node
          this.flatten_(item.getChildren(), result, activeOnly);
        } else if ((activeOnly && item.getState() == 'on' || !activeOnly) && item.getEntry()) {
          var filterId = item.getId();
          if (filterId !== undefined && filterId != '*') {
            result.push(item);
          }
        }
      }
    }
  }

  /**
   * Launches the filter import window.
   *
   * @param {OSFile=} opt_file Optional file to use in the import.
   * @export
   */
  import(opt_file) {
    launchQueryImport(undefined, opt_file);
  }

  /**
   * Handles adds/edits to filters
   *
   * @param {angular.Scope.Event} event
   * @param {FilterEntry} entry
   * @private
   */
  onEditFilter_(event, entry) {
    var filterable = /** @type {IFilterable} */ (getFilterManager().getFilterable(entry.getType()));
    var cols = null;
    try {
      if (filterable) {
        cols = filterable.getFilterColumns();
      }
    } catch (e) {
      // most likely, layer wasn't an IFilterable implementation
    }
    if (cols) {
      BaseFilterManager.edit(entry.getType(), cols, this.editEntry.bind(this), entry);
    } else {
      AlertManager.getInstance().sendAlert('This layer is missing required information to edit filters.',
          AlertEventSeverity.WARNING);
    }
  }

  /**
   * Handles adds/edits to filters
   *
   * @param {angular.Scope.Event} event
   * @param {FilterEntry} entry
   * @private
   */
  onEditComplete_(event, entry) {
    event.stopPropagation();

    this.editEntry(entry);
  }

  /**
   * Handles adds/edits to filters
   *
   * @param {FilterEntry} entry
   * @protected
   */
  editEntry(entry) {
    if (entry) {
      var fqm = getFilterManager();
      var original = fqm.getFilter(entry.getId());

      if (original) {
        // edit
        var rm = new FilterRemove(original);
        var add = new FilterAdd(entry);
        var edit = new SequenceCommand();
        edit.setCommands([rm, add]);
        edit.title = 'Edit Filter ' + entry.getTitle();
        CommandProcessor.getInstance().addCommand(edit);
      } else {
        // add
        CommandProcessor.getInstance().addCommand(new FilterAdd(entry));
      }
    }
  }

  /**
   * Handles adds/edits to filters
   *
   * @param {angular.Scope.Event} event
   * @param {FilterEntry} entry
   * @private
   */
  onCopyFilter_(event, entry) {
    BaseFilterManager.copy(entry, entry.getType());
  }

  /**
   * Preform a search only if a node is added, updated, or removed
   *
   * @param {PropertyChangeEvent} event The event
   * @private
   */
  searchIfAddedOrRemoved_(event) {
    if (event && event.getProperty() !== 'toggle') {
      this.search();
    }
  }

  /**
   * Handles Group By change
   *
   * @export
   */
  onGroupChange() {
    this.search();
    Metrics.getInstance().updateMetric(Filters.GROUP_BY, 1);
  }

  /**
   * Handles Group By change
   *
   * @export
   */
  onSearchTermChange() {
    this.search();
    Metrics.getInstance().updateMetric(Filters.SEARCH, 1);
  }

  /**
   * Handles file drops over the filters tab.
   *
   * @param {Event} event The drop event.
   */
  onDrop_(event) {
    if (event.dataTransfer && event.dataTransfer.files) {
      createFromFile(/** @type {!File} */ (event.dataTransfer.files[0]))
          .addCallback(this.import.bind(this), this.onFail_.bind(this));
    }
  }

  /**
   * Handle file drag-drop.
   *
   * @param {!GoogEvent|OSFile} event
   * @private
   */
  onFail_(event) {
    AlertManager.getInstance().sendAlert(
        'Could not handle file with drag and drop. Try again or use the browse capability.');
  }
}

/**
 * The view options for grouping filters
 * @type {!Object<string, INodeGroupBy>}
 */
Controller.VIEWS = {
  'None': -1, // you can't use null because Angular treats that as the empty/unselected option
  'Layer': new FilterLayerGroupBy(),
  'Layer Type': new FilterLayerGroupBy(true),
  'Source': new SourceGroupBy(true)
};

exports = {
  Controller,
  directive,
  directiveTag
};
