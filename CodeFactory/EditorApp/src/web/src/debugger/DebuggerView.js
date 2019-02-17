import React from 'react';
import Activity from "../utils/Activity";
import WorkersView from './WorkersView';
import DebuggerControls from './DebuggerControls';
import VariablesView from './VariablesView';

export default class DebuggerView extends React.Component {

    constructor(props) {
        super(props);
        this.debugger = null;
        this.workersView = null;
        this.controlsView = null;
        this.variablesView = null;
        this.state = { workers: [], worker: null, stackFrame: null };
        this.eventQueue = []; // events and request responses are not received in sequence, so need to rebuild sequence
    }

    setDebugger(dbg) {
        this.debugger = dbg;
    }

    getDebugger() {
        return this.debugger;
    }

    disconnect() {
        this.setState({ workers: [], worker: null, stackFrame: null }, () => {
            this.debugger.disconnect();
            this.debugger = null;
            const promptoEditor = this.props.container.promptoEditor;
            promptoEditor.stopDebugging();
        });
    }

    processEventQueue() {
        while(this.eventQueue.length) {
            const callback = this.eventQueue.shift();
            callback();
        }
    }

    setWorkers(workers) {
        this.setState({workers: workers}, this.processEventQueue);
    }

    workerSuspendedEvent(event) {
        if (this.state.workers.length > 0)
            this.doWorkerSuspendedEvent(event);
        else
            this.eventQueue.push(() => this.doWorkerSuspendedEvent(event));
    }

    doWorkerSuspendedEvent(event) {
        const worker = this.findWorkerByWorkerId(event.workerId);
        if (worker) {
            worker.state = event.reason;
            this.setState({ workers: this.state.workers }, () => this.doWorkerSuspended(worker) );
        }
    }

    findWorkerByWorkerId(workerId) {
        const idx = this.findWorkerIndex(workerId);
        return idx >= 0 ? this.state.workers[idx] : null;
    }

    findWorkerIndex(workerId) {
        return this.state.workers.findIndex(w => w.workerId === workerId);
    }


    doWorkerSuspended(worker) {
        this.debugger.fetchStack(worker.workerId, stack => {
            this.setWorkerStack(worker.workerId, stack, () => {
                this.workerStackRefreshed(worker);
            });
        });
    }

    workerStackRefreshed(worker) {
        // don't interfere while stepping in another worker
        if(this.state.worker && this.state.worker!==worker)
            return;
        this.setStackFrame(worker.workerId, 0, () => {
            this.controlsView.refreshState();
            this.variablesView.refreshState();
            this.displayDebuggedCode();
        });
    }

    workerResumedEvent(event) {
        const worker = this.findWorkerByWorkerId(event.workerId);
        if (worker) {
            worker.state = "RUNNING";
            worker.stack = null;
            this.setState({workers: this.state.workers}, () => {
                // don't interfere while stepping in another worker
                if(worker===this.state.worker)
                    this.setState({worker: null, stackFrame: null}, () => {
                        this.controlsView.refreshState();
                        this.variablesView.refreshState();
                        this.displayDebuggedCode();
                    });

            });
        }
    }

    displayDebuggedCode() {
        const promptoEditor = this.props.container.promptoEditor;
        const stackFrame = this.state.stackFrame;
        const debugMode = stackFrame ? "STEPPING" : "PROCESSING";
        promptoEditor.setDebugMode(debugMode, () => {
            if(stackFrame)
                promptoEditor.showStackFrame(stackFrame);
        });
    }

    workerCompletedEvent(event, callback) {
        const idx = this.findWorkerIndex(event.workerId);
        if (idx >= 0) {
            const workers = this.state.workers;
            workers.splice(idx, 1);
            this.setState({workers: workers}, () => {
                const promptoEditor = this.props.container.promptoEditor;
                const debugMode = workers.length > 0 ? "PROCESSING" : "IDLING" ;
                promptoEditor.setDebugMode(debugMode, callback);
            });
        }
    }

    setWorkerStack(workerId, stack, callback) {
        if (this.state.workers.length > 0)
            this.doSetWorkerStack(workerId, stack, callback);
        else
            this.eventQueue.push(() => this.doSetWorkerStack(workerId, stack, callback));
    }


    doSetWorkerStack(workerId, stack, callback) {
        const worker = this.findWorkerByWorkerId(workerId);
        if (worker) {
            worker.stack = stack;
            this.setState({workers: this.state.workers}, callback);
        }
    }

    setStackFrame(workerId, index, callback) {
        const worker = this.findWorkerByWorkerId(workerId);
        if (worker && worker.stack && worker.stack.length > index) {
            this.setState({worker: worker, stackFrame: worker.stack[index]}, callback);
        }
    }


    render() {
        const activity = this.props.activity;
        const style = { display: activity===Activity.Debugging ? "block" : "none"};
        return <div className="debugger" style={style}>
            <div className="debugger-left">
                <WorkersView ref={ref=>this.workersView=ref} debuggerView={this}/>
                <DebuggerControls ref={ref=>this.controlsView=ref} debuggerView={this}/>
            </div>
            <div className="debugger-right">
                <VariablesView ref={ref=>this.variablesView=ref} debuggerView={this}/>
            </div>
        </div>;
    }
}