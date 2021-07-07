goog.module('os.map.IMapContainer');
goog.module.declareLegacyNamespace();

const Listenable = goog.requireType('goog.events.Listenable');
const Collection = goog.requireType('ol.Collection');
const Feature = goog.requireType('ol.Feature');
const PluggableMap = goog.requireType('ol.PluggableMap');
const Layer = goog.requireType('ol.layer.Layer');


/**
 * Interface representing a wrapper class for an Openlayers map.
 *
 * @extends {Listenable}
 * @interface
 */
class IMapContainer {
  /**
   * Checks whether the drawing layer contains a feature.
   * @param {Feature|number|string|undefined} feature
   * @return {boolean} True if the feature is on the map, false otherwise
   */
  containsFeature(feature) {}

  /**
   * Adds a feature to the drawing layer.
   * @param {!(Feature)} feature The feature or coordinate to add
   * @param {Object=} opt_style Optional feature style
   * @return {(Feature|undefined)} The feature's id, or undefined if the feature wasn't added
   */
  addFeature(feature, opt_style) {}

  /**
   * Adds an array of features to the drawing layer.
   * @param {!Array<!Feature>} features The features to add
   * @param {Object=} opt_style Optional feature style
   * @return {!Array<!Feature>}
   */
  addFeatures(features, opt_style) {}

  /**
   * Removes a feature from the drawing layer
   * @param {Feature|number|string|undefined} feature The feature or feature id
   * @param {boolean=} opt_dispose If the feature should be disposed
   */
  removeFeature(feature, opt_dispose) {}

  /**
   * Removes an array of features from the drawing layer.
   * @param {!Array<!Feature>} features The features to remove
   * @param {boolean=} opt_dispose If the feature should be disposed
   */
  removeFeatures(features, opt_dispose) {}

  /**
   * Gets a layer by ID, layer, or feature.
   * @param {!(string|Layer|Feature)} layerOrFeature
   * @param {Collection=} opt_search
   * @param {boolean=} opt_remove This is for INTERNAL use only.
   * @return {Layer} The layer or null if no layer was found
   */
  getLayer(layerOrFeature, opt_search, opt_remove) {}

  /**
   * Get the Openlayers map reference.
   * @return {PluggableMap}
   */
  getMap() {}
}

exports = IMapContainer;
