/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { TPromise, PPromise } from 'vs/base/common/winjs.base';
import { IChannel } from 'vs/base/parts/ipc/common/ipc';
import { Event, Emitter } from 'vs/base/common/event';

export interface IMarcoPoloEvent {
	answer: string;
}

export interface ITestService {
	onMarco: Event<IMarcoPoloEvent>;
	marco(): TPromise<string>;
	pong(ping: string): TPromise<{ incoming: string, outgoing: string }>;
	cancelMe(): TPromise<boolean>;
	batchPerf(batches: number, size: number, dataSize: number): PPromise<any, any[]>;
}

export class TestService implements ITestService {

	private _onMarco = new Emitter<IMarcoPoloEvent>();
	onMarco: Event<IMarcoPoloEvent> = this._onMarco.event;

	private _data = 'abcdefghijklmnopqrstuvwxyz';

	marco(): TPromise<string> {
		this._onMarco.fire({ answer: 'polo' });
		return TPromise.as('polo');
	}

	pong(ping: string): TPromise<{ incoming: string, outgoing: string }> {
		return TPromise.as({ incoming: ping, outgoing: 'pong' });
	}

	cancelMe(): TPromise<boolean> {
		return TPromise.timeout(100).then(() => true);
	}

	batchPerf(batches: number, size: number, dataSize: number): PPromise<any, any[]> {
		while (this._data.length < dataSize) {
			this._data += this._data;
		}
		const self = this;
		return new PPromise<any, any[]>((complete, error, progress) => {
			let j = 0;
			function send() {
				if (j >= batches) {
					complete(null);
					return;
				}
				j++;
				const batch = [];
				for (let i = 0; i < size; i++) {
					batch.push({
						prop: `${i}${self._data}`.substr(0, dataSize)
					});
				}
				progress(batch);
				process.nextTick(send);
			}
			process.nextTick(send);
		});
	}
}

export interface ITestChannel extends IChannel {
	listen<IMarcoPoloEvent>(event: 'marco'): Event<IMarcoPoloEvent>;
	listen<T>(event: string, arg?: any): Event<T>;

	call(command: 'marco'): TPromise<any>;
	call(command: 'pong', ping: string): TPromise<any>;
	call(command: 'cancelMe'): TPromise<any>;
	call(command: 'batchPerf', args: { batches: number; size: number; dataSize: number; }): PPromise<any, any[]>;
	call(command: string, ...args: any[]): TPromise<any>;
}

export class TestChannel implements ITestChannel {

	constructor(private testService: ITestService) { }

	listen(event: string, arg?: any): Event<any> {
		switch (event) {
			case 'marco': return this.testService.onMarco;
		}

		throw new Error('Event not found');
	}

	call(command: string, ...args: any[]): TPromise<any> {
		switch (command) {
			case 'pong': return this.testService.pong(args[0]);
			case 'cancelMe': return this.testService.cancelMe();
			case 'marco': return this.testService.marco();
			case 'batchPerf': return this.testService.batchPerf(args[0].batches, args[0].size, args[0].dataSize);
			default: return TPromise.wrapError(new Error('command not found'));
		}
	}
}

export class TestServiceClient implements ITestService {

	get onMarco(): Event<IMarcoPoloEvent> { return this.channel.listen('marco'); }

	constructor(private channel: ITestChannel) { }

	marco(): TPromise<string> {
		return this.channel.call('marco');
	}

	pong(ping: string): TPromise<{ incoming: string, outgoing: string }> {
		return this.channel.call('pong', ping);
	}

	cancelMe(): TPromise<boolean> {
		return this.channel.call('cancelMe');
	}

	batchPerf(batches: number, size: number, dataSize: number): PPromise<any, any[]> {
		return this.channel.call('batchPerf', { batches, size, dataSize });
	}
}