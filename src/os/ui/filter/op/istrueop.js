goog.module('os.ui.filter.op.IsTrue');

const Op = goog.require('os.ui.filter.op.Op');
const DataType = goog.require('os.xsd.DataType');


/**
 * A 'PropertyIsTrue' operation class.
 * Based on the OGC Filter Spec
 */
class IsTrue extends Op {
  /**
   * Constructor.
   */
  constructor() {
    super(
        'And',
        'is true',
        'true',
        [DataType.BOOLEAN, DataType.INTEGER, DataType.STRING],
        'hint="is true"',
        'Supports true, 1, and "true" (case insensitive)',
        'span',
        true
    );
    this.matchHint = 'is true';
  }

  /**
   *
   * @inheritDoc
   */
  getEvalExpression(v, literal) {
    return '(' + v + '===true||' + v + '===1||String(' + v + ').toLowerCase()==="true")';
  }

  /**
   *
   * @inheritDoc
   */
  getFilter(column, literal) {
    var f = [];
    var attr = this.getAttributes();

    f.push('<' + this.localName + (attr ? ' ' + attr : '') + '>');

    f.push(
        '<Not><PropertyIsNull>' +
          '<PropertyName>' + column + '</PropertyName>' +
        '</PropertyIsNull></Not>'
    );

    f.push('<Or>');
    f.push(
        '<PropertyIsEqualTo>' +
          '<PropertyName>' + column + '</PropertyName>' +
          '<Literal><![CDATA[1]]></Literal>' +
        '</PropertyIsEqualTo>'
    );
    f.push(
        '<PropertyIsEqualTo matchCase="false">' +
          '<PropertyName>' + column + '</PropertyName>' +
          '<Literal><![CDATA[true]]></Literal>' +
        '</PropertyIsEqualTo>'
    );
    f.push('</Or>');

    f.push('</' + this.localName + '>');

    return f.join('');
  }
}

exports = IsTrue;
