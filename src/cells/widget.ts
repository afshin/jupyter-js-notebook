// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  IEditorWidget, IEditorModel, EditorWidget
} from '../editor';

import {
  MimeBundle
} from '../notebook/nbformat';

import {
  OutputAreaWidget, ObservableOutputs
} from '../output-area';

import {
  sanitize
} from 'sanitizer';

import {
  ICodeCellModel, ICellModel
} from './model';


/**
 * The class name added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The class name added to code cells.
 */
const CODE_CELL_CLASS = 'jp-CodeCell';

/**
 * The class name added to markdown cells.
 */
const MARKDOWN_CELL_CLASS = 'jp-MarkdownCell';

/**
 * The class name added to the markdown cell renderer widget.
 */
const RENDERER_CLASS = 'jp-MarkdownCell-renderer';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to a rendered markdown cell.
 */
const RENDERED_CLASS = 'jp-mod-rendered';

/**
 * The text applied to an empty markdown cell.
 */
const DEFAULT_MARKDOWN_TEXT = 'Type Markdown and LaTeX: $ α^2 $';


/**
 * A base cell widget.
 */
export
class BaseCellWidget extends Widget {
  /**
   * Create a new editor widget.
   */
  static createEditor(model: IEditorModel): IEditorWidget {
    return new EditorWidget(model);
  }

  /**
   * Construct a new base cell widget.
   */
  constructor(model: ICellModel) {
    super();
    this.addClass(CELL_CLASS);
    this._model = model;
    let constructor = this.constructor as typeof BaseCellWidget;
    this._editor = constructor.createEditor(model.editor);
    // TODO: Create the input area.
    this._input = new Widget();
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addChild(this._input);
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): ICellModel {
    return this._model;
  }

  /**
   * Get the editor widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get editor(): IEditorWidget {
    return this._editor;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    super.dispose();
  }

  private _input: Widget = null;
  private _editor: IEditorWidget = null;
  private _model: ICellModel = null;
}


/**
 * A widget for a code cell.
 */
export
class CodeCellWidget extends BaseCellWidget {

  /**
   * Create an output area widget.
   */
  static createOutput(outputs: ObservableOutputs, rendermime: RenderMime<Widget>): OutputAreaWidget {
    return new OutputAreaWidget(outputs, rendermime);
  }

  /**
   * Construct a code cell widget.
   */
  constructor(model: ICodeCellModel, rendermime: RenderMime<Widget>) {
    super(model);
    this._rendermime = rendermime;
    this.addClass(CODE_CELL_CLASS);
    let constructor = this.constructor as typeof CodeCellWidget;
    this._output = constructor.createOutput(model.outputs, rendermime);
    (this.layout as PanelLayout).addChild(this._output);
  }

  /**
   * Get the output widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get output(): OutputAreaWidget {
    return this._output;
  }

  private _output: OutputAreaWidget = null;
  private _rendermime: RenderMime<Widget> = null;
}


/**
 * A widget for a Markdown cell.
 *
 * #### Notes
 * Things get complicated if we want the rendered text to update
 * any time the text changes, the text editor model changes,
 * or the input area model changes.  We don't support automatically
 * updating the rendered text in all of these cases.
 */
export
class MarkdownCellWidget extends BaseCellWidget {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(model: IMarkdownCellModel, rendermime: RenderMime<Widget>) {
    super(model);
    this._rendermime = rendermime;
    this.addClass(MARKDOWN_CELL_CLASS);
    // Insist on the Github-flavored markdown mode.
    model.mimetype = 'text/x-ipythongfm';
    this._rendered = new Widget();
    this._rendered.addClass(RENDERER_CLASS);
    (this.layout as PanelLayout).addChild(this._rendered);
    this.model.stateChanged.connect(this.onModelChanged, this);
  }

  /**
   * Get the rendering widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get rendered(): Widget {
    return this._rendered;
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    let model = this.model as IMarkdownCellModel;
    if (model.rendered) {
      if (this._dirty) {
        let text = model.input.textEditor.text || DEFAULT_MARKDOWN_TEXT;
        text = sanitize(text);
        let bundle: MimeBundle = { 'text/markdown': text };
        this._rendered.dispose();
        this._rendered = this._rendermime.render(bundle) || new Widget();
        this._rendered.addClass(RENDERER_CLASS);
        (this.layout as PanelLayout).addChild(this._rendered);
      }
      this._rendered.show();
      this.input.hide();
      this.addClass(RENDERED_CLASS);
    } else {
      this._rendered.hide();
      this.input.show();
      this.input.editor.focus();
      this.removeClass(RENDERED_CLASS);
    }
    this._dirty = false;
    super.onUpdateRequest(message);
  }

  private _rendermime: RenderMime<Widget> = null;
  private _rendered: Widget = null;
  private _dirty = true;
}


/**
 * A widget for a raw cell.
 */
export
class RawCellWidget extends BaseCellWidget {
  /**
   * Construct a raw cell widget.
   */
  constructor(model: IRawCellModel) {
    super(model);
    this.addClass(RAW_CELL_CLASS);
  }
}
