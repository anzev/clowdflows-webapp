import {Widget} from "./widget";
import {Workflow} from "./workflow";
import {Output} from "./output";
import {Input} from "./input";
import {UI} from "../services/ui-constants";

export class Connection {

    output:Output;
    input:Input;
    selected:boolean = false;

    constructor(public url:string,
                public output_widget:Widget,  // Widget containing the output signal (connection start)
                public input_widget:Widget,   // Widget containing the input signal (connection end)
                output:string,
                input:string,
                public workflow:Workflow) {
        this.updateInputWidgetRef(input_widget, input);
        this.updateOutputWidgetRef(output_widget, output);
    }

    public static createFromJSON(data:any, workflow:Workflow) : Connection{
        let input_widget:Widget = workflow.widgets.find((widget:Widget) => widget.url == data.input_widget);
        let output_widget:Widget = workflow.widgets.find((widget:Widget) => widget.url == data.output_widget);
        return new Connection(data.url, output_widget, input_widget, data.output, data.input, workflow);
    }

    updateInputWidgetRef(inputWidget:Widget, inputUrl:string) {
        this.input_widget = inputWidget;
        this.input = inputWidget.inputs.find(inputObj => inputObj.url == inputUrl);
        this.input.connection = this;
    }

    updateOutputWidgetRef(outputWidget:Widget, outputUrl:string) {
        this.output_widget = outputWidget;
        this.output = outputWidget.outputs.find(outputObj => outputObj.url == outputUrl);
        this.output.connection = this;
    }

    get bezierPoints():string {
        let outputX:number = this.output_widget.x + this.output.x + UI.signalWidth;
        let outputY:number = this.output_widget.y + this.output.y + UI.signalHeight/2;
        let inputX:number = this.input_widget.x + this.input.x;
        let inputY:number = this.input_widget.y + this.input.y + UI.signalHeight/2;

        var p1 = [outputX, outputY];
        var p2 = [inputX, inputY];

        var coeffMulDirection = 100;
        var distance = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
        if (distance < coeffMulDirection) {
            coeffMulDirection = distance / 4;
        }


        var d1 = [1 * coeffMulDirection,
            0 * coeffMulDirection];
        var d2 = [-1 * coeffMulDirection,
            0 * coeffMulDirection];

        if (outputX > inputX && Math.abs(outputY - inputY) < 65) {
            coeffMulDirection = 150;
            var d1 = [1 * coeffMulDirection,
                -1 * coeffMulDirection];
            var d2 = [-1 * coeffMulDirection,
                -1 * coeffMulDirection];
        }

        var bezierPoints:any[] = [];
        bezierPoints[0] = p1;
        bezierPoints[1] = [p1[0] + d1[0], p1[1] + d1[1]];
        bezierPoints[2] = [p2[0] + d2[0], p2[1] + d2[1]];
        bezierPoints[3] = p2;
        var min = [p1[0], p1[1]];
        var max = [p1[0], p1[1]];
        for (var i = 1; i < bezierPoints.length; i++) {
            var p = bezierPoints[i];
            if (p[0] < min[0]) {
                min[0] = p[0];
            }
            if (p[1] < min[1]) {
                min[1] = p[1];
            }
            if (p[0] > max[0]) {
                max[0] = p[0];
            }
            if (p[1] > max[1]) {
                max[1] = p[1];
            }
        }

        return "M"+bezierPoints[0][0]+","+bezierPoints[0][1]+" C"+bezierPoints[1][0]+","+bezierPoints[1][1]+" "+bezierPoints[2][0]+","+bezierPoints[2][1]+" "+bezierPoints[3][0]+","+bezierPoints[3][1];
    }
}