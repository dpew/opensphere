goog.module('os.mixin.IconImageMixin');

const {iconImageCache} = goog.require('ol.style');

const ImageState = goog.requireType('ol.ImageState');
const IconImage = goog.require('ol.style.IconImage');
const FallbackIconImage = goog.require('os.style.FallbackIconImage');


/**
 * Overridden to return our own type for the image
 *
 * @param {Image|HTMLCanvasElement} image Image.
 * @param {string} src Src.
 * @param {ol.Size} size Size.
 * @param {?string} crossOrigin Cross origin.
 * @param {ImageState} imageState Image state.
 * @param {ol.Color} color Color.
 * @return {IconImage} Icon image.
 * @suppress {duplicate}
 */
IconImage.get = function(image, src, size, crossOrigin, imageState, color) {
  var iconImage = iconImageCache.get(src, crossOrigin, color);
  if (!iconImage) {
    iconImage = new FallbackIconImage(image, src, size, crossOrigin, imageState, color);
    iconImageCache.set(src, crossOrigin, color, iconImage);
  }
  return iconImage;
};
