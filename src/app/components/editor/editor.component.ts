import {Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
import {ActivatedRoute, Router, Params} from '@angular/router';
import {ToolbarComponent} from "./toolbar/toolbar.component";
import {WidgetTreeComponent} from "./widget-tree/widget-tree.component";
import {WidgetCanvasComponent} from "./widget-canvas/widget-canvas.component";
import {LoggingComponent} from "./logging/logging.component";
import {AbstractWidget} from "../../models/abstract-widget";
import {ClowdFlowsDataService} from "../../services/clowdflows-data.service";
import {LoggerService} from "../../services/logger.service";
import {Widget} from "../../models/widget";
import {Connection} from "../../models/connection";
import {Output as WorkflowOutput} from "../../models/output";
import {Workflow} from "../../models/workflow";
import {DomSanitizationService} from "@angular/platform-browser";
import {TAB_DIRECTIVES} from 'ng2-bootstrap/ng2-bootstrap';
import {specialWidgetNames} from '../../services/special-widgets';

@Component({
    selector: 'editor',
    template: require('./editor.component.html'),
    styles: [require('./editor.component.css')],
    directives: [ToolbarComponent, WidgetTreeComponent, WidgetCanvasComponent, LoggingComponent, TAB_DIRECTIVES]
})
export class EditorComponent implements OnInit, OnDestroy {
    @ViewChild(WidgetCanvasComponent) canvasComponent:WidgetCanvasComponent;
    workflow:any = {};
    workflows:Workflow[] = [];
    userWorkflows:Workflow[] = [];
    sub:any;

    loadedSubprocesses:any = {};
    activeWorkflow:Workflow = null;

    constructor(private domSanitizer:DomSanitizationService,
                private clowdflowsDataService:ClowdFlowsDataService,
                private route:ActivatedRoute,
                private router: Router,
                private loggerService:LoggerService) {
    }

    addWidget(abstractWidget:AbstractWidget) {

        if (abstractWidget.special) {
            // Handle subprocesses, for loop inputs, etc
            this.addSpecialWidget(abstractWidget);
        } else {
            // Regular widgets
            let activeWorkflow = this.activeWorkflow;
            let widgetData = {
                workflow: activeWorkflow.url,
                x: 50,
                y: 50,
                name: abstractWidget.name,
                abstract_widget: abstractWidget.id,
                finished: false,
                error: false,
                running: false,
                interaction_waiting: false,
                type: 'regular',
                progress: 0
            };

            // Sync with server
            this.clowdflowsDataService
                .createWidget(widgetData)
                .then((data) => {
                    let error = this.reportMessage(data);
                    if (!error) {
                        let widget:Widget = Widget.createFromJSON(data, activeWorkflow);
                        activeWorkflow.widgets.push(widget);
                    }
                });
        }
    }

    addSpecialWidget(abstractWidget:AbstractWidget) {
        let activeWorkflow = this.activeWorkflow;

        if (abstractWidget.name == specialWidgetNames.subprocessWidget) {
            // Adding a new subprocess
            this.clowdflowsDataService
                .addSubprocessToWorkflow(activeWorkflow)
                .then((data) => {
                    let error = this.reportMessage(data);
                    if (!error) {
                        let widget:Widget = Widget.createFromJSON(data, activeWorkflow);
                        activeWorkflow.widgets.push(widget);
                    }
                });
        } else if (abstractWidget.name == specialWidgetNames.inputWidget) {
            // Adding a new input
            this.clowdflowsDataService
                .addInputToSubprocess(activeWorkflow)
                .then((data) => {
                    let error = this.reportMessage(data);
                    if (!error) {
                        let widget:Widget = Widget.createFromJSON(data, activeWorkflow);
                        activeWorkflow.widgets.push(widget);
                        if (activeWorkflow.subprocessWidget) {
                            this.updateWidget(activeWorkflow.subprocessWidget);
                        }
                    }
                });
        } else if (abstractWidget.name == specialWidgetNames.outputWidget) {
            // Adding a new output
            this.clowdflowsDataService
                .addOutputToSubprocess(activeWorkflow)
                .then((data) => {
                    let error = this.reportMessage(data);
                    if (!error) {
                        let widget:Widget = Widget.createFromJSON(data, activeWorkflow);
                        activeWorkflow.widgets.push(widget);
                        if (activeWorkflow.subprocessWidget) {
                            this.updateWidget(activeWorkflow.subprocessWidget);
                        }
                    }
                });
        } else if (abstractWidget.name == specialWidgetNames.forLoopWidgets) {
            // Adding for loop widgets
            this.clowdflowsDataService
                .addForLoopToSubprocess(activeWorkflow)
                .then((data) => {
                    let error = this.reportMessage(data);
                    if (!error) {
                        for (let widgetData of <Array<Widget>> data) {
                            let widget:Widget = Widget.createFromJSON(widgetData, activeWorkflow);
                            activeWorkflow.widgets.push(widget);
                        }
                        if (activeWorkflow.subprocessWidget) {
                            this.updateWidget(activeWorkflow.subprocessWidget);
                        }
                    }
                });
        } else if (abstractWidget.name == specialWidgetNames.xValidationWidgets) {
            // Adding CV widgets
            this.clowdflowsDataService
                .addXValidationToSubprocess(activeWorkflow)
                .then((data) => {
                    let error = this.reportMessage(data);
                    if (!error) {
                        for (let widgetData of <Array<Widget>> data) {
                            let widget:Widget = Widget.createFromJSON(widgetData, activeWorkflow);
                            activeWorkflow.widgets.push(widget);
                        }
                        if (activeWorkflow.subprocessWidget) {
                            this.updateWidget(activeWorkflow.subprocessWidget);
                        }
                    }
                });
        }
    }

    copyWidget(widget:Widget) {
        let activeWorkflow = this.activeWorkflow;
        let widgetData = {
            workflow: this.workflow.url,
            x: widget.x + 50,
            y: widget.y + 50,
            name: `${widget.name} (copy)`,
            abstract_widget: widget.abstract_widget,
            finished: false,
            error: false,
            running: false,
            interaction_waiting: false,
            type: widget.type,
            progress: 0
        };

        // Sync with server
        this.clowdflowsDataService
            .createWidget(widgetData)
            .then((data) => {
                let error = this.reportMessage(data);
                if (!error) {
                    let widget:Widget = Widget.createFromJSON(data, activeWorkflow);
                    this.workflow.widgets.push(widget);
                }
            });
    }

    saveWidget(widget:Widget) {
        this.clowdflowsDataService
            .saveWidget(widget)
            .then((data) => {
                this.reportMessage(data);
            });
    }

    saveWidgetPosition(widget:Widget) {
        this.clowdflowsDataService
            .saveWidgetPosition(widget)
            .then((data) => {
                this.reportMessage(data);
            });
    }

    deleteWidget(widget:Widget) {
        let workflow = widget.workflow;
        // Delete the connections
        for (let conn of workflow.connections) {
            if (conn.input_widget == widget || conn.output_widget == widget) {
                this.deleteConnection(conn, true);
            }
        }
        // Delete the widget
        this.clowdflowsDataService
            .deleteWidget(widget)
            .then(
                (data) => {
                    let error = this.reportMessage(data);
                    if (!error) {
                        let idx = workflow.widgets.indexOf(widget);
                        workflow.widgets.splice(idx, 1);

                        if (widget.isSpecialWidget) {
                            this.updateWidget(widget.workflow.subprocessWidget);
                        }
                    }
                }
            );

        if (widget.type == 'subprocess') {
            if (widget.workflow_link in this.loadedSubprocesses) {
                let workflow = this.loadedSubprocesses[widget.workflow_link];
                let idx = this.workflows.indexOf(workflow);
                this.workflows.splice(idx, 1);
            }
        }
    }

    resetWidget(widget:Widget) {
        this.clowdflowsDataService
            .resetWidget(widget)
            .then((data) => {
                this.reportMessage(data);
            });
    }

    runWidget(widget:Widget) {
        this.clowdflowsDataService
            .runWidget(widget)
            .then((data) => {
                this.reportMessage(data);
            });
    }

    updateWidget(widget:Widget) {
        let workflow = widget.workflow;
        return this.clowdflowsDataService
            .getWidget(widget.id)
            .then((data) => {
                let newWidget:Widget = Widget.createFromJSON(data, workflow);
                // Update connection references
                for (let conn of this.workflow.connections.filter((c:Connection) => c.input_widget.url == newWidget.url)) {
                    conn.input_widget = newWidget;
                }
                for (let conn of this.workflow.connections.filter((c:Connection) => c.output_widget.url == newWidget.url)) {
                    conn.output_widget = newWidget;
                }
                // Remove old version
                let idx = workflow.widgets.indexOf(widget);
                workflow.widgets.splice(idx, 1);
                workflow.widgets.push(newWidget);
                return newWidget;
            });
    }

    fetchOutputValue(output:WorkflowOutput) {
        this.clowdflowsDataService
            .fetchOutputValue(output)
            .then((data) => {
                let error = this.reportMessage(data);
                if (!error) {
                    output.value = data.value;
                }
            });
    }

    addConnection(event:any) {
        var selectedInput = event.selectedInput;
        var selectedOutput = event.selectedOutput;
        let workflow = event.workflow;
        let canvasTab = event.canvasTab;
        let connectionData = {
            input: selectedInput.url,
            output: selectedOutput.url,
            workflow: workflow.url,
        };
        var updateInputs = selectedInput.multi_id != 0;
        this.clowdflowsDataService
            .createConnection(connectionData)
            .then((data) => {
                let error = this.reportMessage(data);
                if (!error) {
                    let input_widget:Widget = workflow.widgets.find((widget:Widget) => widget.url == data.input_widget);
                    let output_widget:Widget = workflow.widgets.find((widget:Widget) => widget.url == data.output_widget);
                    let connection = new Connection(data.url, output_widget, input_widget, data.output, data.input, workflow);
                    workflow.connections.push(connection);
                    selectedInput.connection = connection;
                    canvasTab.unselectSignals();
                    if (updateInputs) {
                        this.updateWidget(input_widget);
                    }
                }
            });
    }

    deleteConnection(connection:Connection, widgetDelete=false) {
        let workflow = connection.workflow;
        var updateInputs = connection.input.multi_id != 0 && !widgetDelete;
        this.clowdflowsDataService
            .deleteConnection(connection)
            .then((data) => {
                let error = this.reportMessage(data);
                if (!error) {
                    let idx = workflow.connections.indexOf(connection);
                    workflow.connections.splice(idx, 1);
                    if (updateInputs) {
                       this.updateWidget(connection.input_widget);
                    }
                }
            });
    }

    runWorkflow() {
        this.clowdflowsDataService
            .runWorkflow(this.activeWorkflow)
            .then((data) => {
                this.reportMessage(data);
            });
    }

    resetWorkflow() {
        this.clowdflowsDataService
            .resetWorkflow(this.workflow)
            .then((data) => {
                this.reportMessage(data);
            });
    }

    createWorkflow() {
        let workflowData:any = {
            name: 'Untitled workflow',
            is_public: false,
            description: '',
            widget: null,
            template_parent: null
        };
        this.clowdflowsDataService
            .createWorkflow(workflowData)
            .then((data:any) => {
                let error = this.reportMessage(data);
                if (!error) {
                    this.router.navigate(['/editor', data.id]);
                }
            });
    }

    saveWorkflow() {
        this.clowdflowsDataService
            .saveWorkflowInfo(this.workflow)
            .then((data:any) => {
                this.reportMessage(data);
            });
    }

    receiveWorkflowUpdate(data:any) {
        let widget = this.workflow.widgets.find((widgetObj:Widget) => widgetObj.id == data.widget_pk);
        if (widget != undefined) {
            if (data.status.finished && !widget.finished) {
                if (data.status.is_visualization) {
                    this.visualizeWidget(widget);
                }
            }

            if (!data.status.finished && data.status.interaction_waiting) {
                if (!widget.showInteractionDialog) {
                    this.interactWidget(widget);
                }
            }

            widget.finished = data.status.finished;
            widget.error = data.status.error;
            widget.running = data.status.running;
            widget.interaction_waiting = data.status.interaction_waiting;
        }
    }

    openSubprocess(widget:Widget) {
        let workflowUrl = widget.workflow_link;
        if (!(workflowUrl in this.loadedSubprocesses)) {
            this.clowdflowsDataService.getWorkflow(workflowUrl)
                .then(data => {
                    let subprocessWorkflow = this.parseWorkflow(data);
                    subprocessWorkflow.subprocessWidget = widget;
                    this.workflows.push(subprocessWorkflow);
                    this.loadedSubprocesses[workflowUrl] = subprocessWorkflow;
                    this.switchToWorkflowTab(subprocessWorkflow);
                });
        } else {
            let subprocessWorkflow = this.loadedSubprocesses[workflowUrl];
            this.switchToWorkflowTab(subprocessWorkflow);
        }
        widget.selected = false;
    }

    switchToWorkflowTab(workflowToActivate:Workflow) {
        for (let workflow of this.workflows) {
            workflow.active = false;
        }
        workflowToActivate.active = true;
        this.activeWorkflow = workflowToActivate;
    }

    visualizeWidget(widget:Widget) {
        this.clowdflowsDataService
            .visualizeWidget(widget)
            .then(response => {
                //noinspection TypeScriptValidateTypes
                widget.visualizationHtml = this.domSanitizer.bypassSecurityTrustHtml(response.text());
                widget.showVisualizationDialog = true;
            });
    }

    interactWidget(widget:Widget) {
        this.clowdflowsDataService
            .interactWidget(widget)
            .then(response => {
                //noinspection TypeScriptValidateTypes
                widget.interactionHtml = this.domSanitizer.bypassSecurityTrustHtml(response.text());
                widget.showInteractionDialog = true;
            });
    }

    private parseWorkflow(data:any):Workflow {
        let workflow = new Workflow(data.id, data.url, data.widgets, data.connections, data.is_subprocess, data.name,
            data.is_public, data.owner, data.description, data.widget, data.template_parent);
        return workflow;
    }

    private reportMessage(data:any):boolean {
        let error:boolean = false;
        if (data && 'status' in data) {
            if (data.status == 'error') {
                this.loggerService.error(data.message || 'Problem executing action');
                error = true;
            } else if (data.status == 'ok' && 'message' in data) {
                this.loggerService.info(data.message);
            }
        }
        return error;
    }

    ngOnInit() {
        this.sub = this.route.params.subscribe((params: Params) => {

            // Fetch the current workflow
            let id = +params['id'];
            this.clowdflowsDataService.getWorkflow(id)
                .then(data => {
                    this.workflow = this.parseWorkflow(data);
                    this.workflows = [];  // Clear workflow tabs on load
                    this.workflows.push(this.workflow);
                    this.switchToWorkflowTab(this.workflow);
                    this.clowdflowsDataService.workflowUpdates((data:any) => {
                        this.receiveWorkflowUpdate(data);
                    }, this.workflow);

                    this.loggerService.success("Successfully loaded workflow.");
                });

            // Fetch all of the user's workflows
            this.clowdflowsDataService.getUserWorkflows()
                .then(userWorkflows => {
                   this.userWorkflows = <Workflow[]> userWorkflows;
                });
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
