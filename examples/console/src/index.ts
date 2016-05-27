/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  ConsolePanel, ConsoleWidget, ConsoleModel, findKernel
} from 'jupyter-js-notebook';

import {
  ContentsManager, IKernelSpecIds, startNewSession,
  getKernelSpecs
} from 'jupyter-js-services';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  ConsoleTextRenderer, JavascriptRenderer, SVGRenderer, MarkdownRenderer
} from 'jupyter-js-ui/lib/renderers';

import {
  getBaseUrl
} from 'jupyter-js-utils';

import {
  CommandPalette, StandardPaletteModel, IStandardPaletteItemOptions
} from 'phosphor-commandpalette';

import {
  KeymapManager, IKeyBinding
} from 'phosphor-keymap';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  Widget
} from 'phosphor-widget';

import 'jupyter-js-notebook/lib/index.css';
import 'jupyter-js-notebook/lib/theme.css';
import 'jupyter-js-ui/lib/dialog/index.css';
import 'jupyter-js-ui/lib/dialog/theme.css';


let SERVER_URL = getBaseUrl();
let TITLE = 'Console';


function main(): void {
  // Initialize the keymap manager with the bindings.
  var keymap = new KeymapManager();

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    keymap.processKeydownEvent(event);
  });

  let contents = new ContentsManager(SERVER_URL);
  let rendermime = new RenderMime<Widget>();
  const transformers = [
    new JavascriptRenderer(),
    new HTMLRenderer(),
    new ImageRenderer(),
    new SVGRenderer(),
    new LatexRenderer(),
    new ConsoleTextRenderer(),
    new TextRenderer(),
    new MarkdownRenderer()
  ];

  for (let t of transformers) {
    for (let m of t.mimetypes) {
      rendermime.order.push(m);
      rendermime.renderers[m] = t;
    }
  }

  let consoleModel = new ConsoleModel();
  let consoleWidget = new ConsolePanel(consoleModel, rendermime);
  consoleWidget.title.text = TITLE;

  let pModel = new StandardPaletteModel();
  let palette = new CommandPalette();
  palette.model = pModel;

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = SplitPanel.Horizontal;
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(consoleWidget, 1);
  panel.attach(document.body);
  panel.addChild(palette);
  panel.addChild(consoleWidget);
  window.onresize = () => { panel.update(); };

  let kernelspecs: IKernelSpecIds;

  let items: IStandardPaletteItemOptions[] = [
    {
      category: 'Console',
      text: 'Clear',
      shortcut: 'Accel R',
      handler: () => { consoleModel.clear(); }
    },
    {
      category: 'Console',
      text: 'Execute Prompt',
      shortcut: 'Shift Enter',
      handler: () => { consoleModel.run(); }
    }
  ];
  pModel.addItems(items);

  let bindings = [
    {
      selector: '.jp-Console',
      sequence: ['Accel R'],
      handler: () => { consoleModel.clear(); }
    },
    {
      selector: '.jp-Console',
      sequence: ['Shift Enter'],
      handler: () => { consoleModel.run(); }
    }
  ]
  keymap.add(bindings);

  getKernelSpecs({}).then(specs => {
    kernelspecs = specs;
    let kernelName = specs.default;
    let language = specs.default;
    return startNewSession({
      notebookPath: 'fake_path',
      kernelName: findKernel(kernelName, language, specs),
      baseUrl: SERVER_URL
    });
  }).then(session => consoleModel.session = session);
}

window.onload = main;
