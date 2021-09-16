goog.module('plugin.file.csv.ui.CSVImportUI');

const DataManager = goog.require('os.data.DataManager');
const FileDescriptor = goog.require('os.data.FileDescriptor');
const MappingManager = goog.require('os.im.mapping.MappingManager');
const csv = goog.require('os.ui.file.csv');
const ConfigStep = goog.require('os.ui.file.ui.csv.ConfigStep');
const FileImportUI = goog.require('os.ui.im.FileImportUI');
const osWindow = goog.require('os.ui.window');
const windowSelector = goog.require('os.ui.windowSelector');
const GeometryStep = goog.require('os.ui.wiz.GeometryStep');
const OptionsStep = goog.require('os.ui.wiz.OptionsStep');
const TimeStep = goog.require('os.ui.wiz.step.TimeStep');
const CSVDescriptor = goog.require('plugin.file.csv.CSVDescriptor');
const CSVParserConfig = goog.require('plugin.file.csv.CSVParserConfig');
const CSVProvider = goog.require('plugin.file.csv.CSVProvider');
const {directiveTag: importUi} = goog.require('plugin.file.csv.ui.CSVImport');


/**
 * @extends {FileImportUI.<CSVParserConfig>}
 */
class CSVImportUI extends FileImportUI {
  /**
   * Constructor.
   */
  constructor() {
    super();
  }

  /**
   * @inheritDoc
   */
  getTitle() {
    return 'CSV';
  }

  /**
   * @inheritDoc
   */
  launchUI(file, opt_config) {
    super.launchUI(file, opt_config);

    const config = new CSVParserConfig();

    if (opt_config) {
      this.mergeConfig(opt_config, config);
    }

    config['file'] = file;
    config['title'] = file.getFileName();
    config.updateLinePreview();

    if (opt_config && opt_config['defaultImport']) {
      this.handleDefaultImport(file, config);
      return;
    }

    const steps = [
      new ConfigStep(),
      new GeometryStep(),
      new TimeStep(),
      new OptionsStep()
    ];

    const scopeOptions = {
      'config': config,
      'steps': steps
    };
    const windowOptions = {
      'label': 'CSV Import',
      'icon': 'fa fa-sign-in',
      'x': 'center',
      'y': 'center',
      'width': '900',
      'min-width': '500',
      'max-width': '2000',
      'height': '700',
      'min-height': '500',
      'max-height': '2000',
      'modal': true,
      'show-close': true
    };
    const template = `<${importUi} resize-with="${windowSelector.WINDOW}"></${importUi}>`;
    osWindow.create(windowOptions, template, undefined, undefined, undefined, scopeOptions);
  }

  /**
   * @inheritDoc
   */
  mergeConfig(from, to) {
    super.mergeConfig(from, to);

    to['commentChar'] = from['commentChar'];
    to['dataRow'] = from['dataRow'];
    to['delimiter'] = from['delimiter'];
    to['headerRow'] = from['headerRow'];
    to['useHeader'] = from['useHeader'];
  }

  /**
   * @inheritDoc
   */
  getDefaultConfig(file, config) {
    // use the default expected CSV config values before doing the preview and mapping autodetection
    const conf = csv.DEFAULT_CONFIG;
    config['color'] = conf['color'];
    config['commentChar'] = conf['commentChar'];
    config['dataRow'] = conf['dataRow'];
    config['delimiter'] = conf['delimiter'];
    config['headerRow'] = conf['headerRow'];
    config['useHeader'] = conf['useHeader'];

    try {
      config.updatePreview();

      const features = config['preview'];
      if ((!config['mappings'] || config['mappings'].length <= 0) && features && features.length > 0) {
        // no mappings have been set yet, so try to auto detect them
        const mm = MappingManager.getInstance();
        const mappings = mm.autoDetect(features);
        if (mappings && mappings.length > 0) {
          config['mappings'] = mappings;
        }
      }
    } catch (e) {
    }

    return config;
  }

  /**
   * @inheritDoc
   */
  handleDefaultImport(file, config) {
    config['file'] = file;
    config['title'] = file.getFileName();

    config = this.getDefaultConfig(file, config);

    // create the descriptor and add it
    if (config) {
      const provider = CSVProvider.getInstance();
      const descriptor = new CSVDescriptor(config);
      FileDescriptor.createFromConfig(descriptor, provider, config);

      provider.addDescriptor(descriptor);
      DataManager.getInstance().addDescriptor(descriptor);
      descriptor.setActive(true);
    }
  }
}

exports = CSVImportUI;
