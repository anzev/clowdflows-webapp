import {Component, Input} from '@angular/core';
import {Category} from "../models/category";
import {ConfigService} from "../services/config.service";
import {AbstractWidget} from "../models/abstract-widget";

@Component({
    selector: 'tree-view',
    templateUrl: 'app/components/tree-view.component.html',
    styleUrls: ['app/components/tree-view.component.css'],
    directives:[TreeViewComponent]
})
export class TreeViewComponent {
    @Input() categories:Category[];

    constructor(private config:ConfigService) {}

    iconUrl(widget:AbstractWidget):string {
        let url = '/app/images/question-mark.png';
        if (widget.static_image) {
            url = `${this.config.base_url}/static/${widget.cfpackage}/icons/treeview/${widget.static_image}`;
        }
        return url;
    }
}
