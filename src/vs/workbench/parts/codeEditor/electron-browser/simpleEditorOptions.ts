/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ICodeEditorWidgetOptions } from 'vs/editor/browser/widget/codeEditorWidget';
import { MenuPreventer } from 'vs/workbench/parts/codeEditor/electron-browser/menuPreventer';
import { SelectionClipboard } from 'vs/workbench/parts/codeEditor/electron-browser/selectionClipboard';
import { ContextMenuController } from 'vs/editor/contrib/contextmenu/contextmenu';
import { SuggestController } from 'vs/editor/contrib/suggest/suggestController';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { TabCompletionController } from 'vs/workbench/parts/snippets/electron-browser/tabCompletion';

export function getSimpleCodeEditorWidgetOptions(): ICodeEditorWidgetOptions {
	return {
		isSimpleWidget: true,
		contributions: [
			MenuPreventer,
			SelectionClipboard,
			ContextMenuController,
			SuggestController,
			SnippetController2,
			TabCompletionController,
		]
	};
}

export function getSimpleEditorOptions(): IEditorOptions {
	return {
		wordWrap: 'on',
		overviewRulerLanes: 0,
		glyphMargin: false,
		lineNumbers: 'off',
		folding: false,
		selectOnLineNumbers: false,
		hideCursorInOverviewRuler: true,
		selectionHighlight: false,
		scrollbar: {
			horizontal: 'hidden'
		},
		lineDecorationsWidth: 0,
		overviewRulerBorder: false,
		scrollBeyondLastLine: false,
		renderLineHighlight: 'none',
		fixedOverflowWidgets: true,
		acceptSuggestionOnEnter: 'smart',
		minimap: {
			enabled: false
		}
	};
}
