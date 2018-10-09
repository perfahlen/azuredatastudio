/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { IInsightOptions, IInsight } from './insights/interfaces';
import { Graph } from './insights/graphInsight';
import * as PathUtilities from 'sql/common/pathUtilities';
import { QueryEditor } from 'sql/parts/query/editor/queryEditor';
import { IClipboardService } from 'sql/platform/clipboard/common/clipboardService';
import { IInsightsConfig } from 'sql/parts/dashboard/widgets/insights/interfaces';

import { localize } from 'vs/nls';
import { Action } from 'vs/base/common/actions';
import { TPromise } from 'vs/base/common/winjs.base';
import { join, normalize } from 'vs/base/common/paths';
import { writeFile } from 'vs/base/node/pfs';
import { IWindowsService, IWindowService } from 'vs/platform/windows/common/windows';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import URI from 'vs/base/common/uri';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IUntitledEditorService } from 'vs/workbench/services/untitled/common/untitledEditorService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';

export interface IChartActionContext {
	options: IInsightOptions;
	insight: IInsight;
	uri: string;
}

export class CreateInsightAction extends Action {
	public static ID = 'chartview.createInsight';
	public static LABEL = localize('createInsightLabel', "Create Insight");
	public static ICON = 'createInsight';

	constructor(
		@IEditorService private editorService: IEditorService,
		@INotificationService private notificationService: INotificationService,
		@IUntitledEditorService private untitledEditorService: IUntitledEditorService
	) {
		super(CreateInsightAction.ID, CreateInsightAction.LABEL, CreateInsightAction.ICON);
	}

	public run(context: IChartActionContext): TPromise<boolean> {
		let uri: URI = URI.parse(context.uri);
		let queryFile: string = uri.fsPath;
		let query: string = undefined;
		let type = {};
		let options = Object.assign({}, context.options);
		delete options.type;
		type[context.options.type] = options;
		// create JSON
		let config: IInsightsConfig = {
			type,
			query,
			queryFile
		};

		let widgetConfig = {
			name: localize('myWidgetName', 'My-Widget'),
			gridItemConfig: {
				sizex: 2,
				sizey: 1
			},
			widget: {
				'insights-widget': config
			}
		};

		let input = this.untitledEditorService.createOrGet(undefined, 'json', JSON.stringify(widgetConfig));

		return this.editorService.openEditor(input, { pinned: true })
			.then(
				() => true,
				error => {
					this.notificationService.notify({
						severity: Severity.Error,
						message: error
					});
					return false;
				}
			);
	}
}

export class CopyAction extends Action {
	public static ID = 'chartview.copy';
	public static LABEL = localize('copyChartLabel', "Copy as image");
	public static ICON = 'copyImage';

	constructor(
		@IClipboardService private clipboardService: IClipboardService,
		@INotificationService private notificationService: INotificationService
	) {
		super(CopyAction.ID, CopyAction.LABEL, CopyAction.ICON);
	}

	public run(context: IChartActionContext): TPromise<boolean> {
		if (context.insight instanceof Graph) {
			let data = context.insight.getCanvasData();
			if (!data) {
				this.showError(localize('chartNotFound', 'Could not find chart to save'));
				return TPromise.as(false);
			}

			this.clipboardService.writeImageDataUrl(data);
			return TPromise.as(true);
		}
		return TPromise.as(false);
	}

	private showError(errorMsg: string) {
		this.notificationService.notify({
			severity: Severity.Error,
			message: errorMsg
		});
	}
}

export class SaveImageAction extends Action {
	public static ID = 'chartview.saveImage';
	public static LABEL = localize('saveImageLabel', "Save as image");
	public static ICON = 'saveAsImage';

	constructor(
		@IWindowsService private windowsService: IWindowsService,
		@IWindowService private windowService: IWindowService,
		@INotificationService private notificationService: INotificationService,
		@IEditorService private editorService: IEditorService,
		@IWorkspaceContextService private workspaceContextService: IWorkspaceContextService
	) {
		super(SaveImageAction.ID, SaveImageAction.LABEL, SaveImageAction.ICON);
	}

	public run(context: IChartActionContext): TPromise<boolean> {
		if (context.insight instanceof Graph) {
			return this.promptForFilepath(context.uri).then(filePath => {
				let data = (<Graph>context.insight).getCanvasData();
				if (!data) {
					this.showError(localize('chartNotFound', 'Could not find chart to save'));
					return false;
				}
				if (filePath) {
					let buffer = this.decodeBase64Image(data);
					writeFile(filePath, buffer).then(undefined, (err) => {
						if (err) {
							this.showError(err.message);
						} else {
							let fileUri = URI.file(filePath);
							this.windowsService.openExternal(fileUri.toString());
							this.notificationService.notify({
								severity: Severity.Error,
								message: localize('chartSaved', 'Saved Chart to path: {0}', filePath)
							});
						}
					});
				}
				return true;
			});
		}
		return TPromise.as(false);
	}

	private decodeBase64Image(data: string): Buffer {
		let matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
		return new Buffer(matches[2], 'base64');
	}

	private promptForFilepath(uri: string): TPromise<string> {
		let filepathPlaceHolder = PathUtilities.resolveCurrentDirectory(uri, PathUtilities.getRootPath(this.workspaceContextService));
		filepathPlaceHolder = join(filepathPlaceHolder, 'chart.png');
		return this.windowService.showSaveDialog({
			title: localize('chartViewer.saveAsFileTitle', 'Choose Results File'),
			defaultPath: normalize(filepathPlaceHolder, true)
		});
	}

	private showError(errorMsg: string) {
		this.notificationService.notify({
			severity: Severity.Error,
			message: errorMsg
		});
	}
}
