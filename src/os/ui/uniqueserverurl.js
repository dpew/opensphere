goog.module('os.ui.uniqueServerUrl');

const Module = goog.require('os.ui.Module');


/**
 * @return {angular.Directive}
 */
const directive = () => ({
  'require': 'ngModel',
  'link': uniqueServerUrl
});

/**
 * The element tag for the directive.
 * @type {string}
 */
const directiveTag = 'unique-server-url';

/**
 * Link function for unique title directive
 *
 * @param {!angular.Scope} $scope
 * @param {!angular.JQLite} $element
 * @param {!angular.Attributes} $attrs
 * @param {!Object} $ctrl
 * @ngInject
 * @private
 */
const uniqueServerUrl = function($scope, $element, $attrs, $ctrl) {
  var check = function(viewValue) {
    // mark empty URL's as unique. they will be marked invalid by require, otherwise assumed valid.
    if (viewValue && $scope['config']) {
      var config = $scope['config'];
      var alternateUrls = config['alternateUrls'] || [];
      var index = alternateUrls.indexOf(viewValue);
      if (index != $scope['$index'] && index != -1) {
        $ctrl.$setValidity('unique', false);
        return viewValue;
      }
    }

    $ctrl.$setValidity('unique', true);
    return viewValue;
  };

  $ctrl.$formatters.unshift(check);
  $ctrl.$parsers.unshift(check);
};

/**
 * Add the unique title directive
 */
Module.directive('uniqueServerUrl', [directive]);

exports = {
  directive,
  directiveTag
};
