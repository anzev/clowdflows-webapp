import {Directive, ElementRef, OnInit, Renderer2, OnDestroy} from '@angular/core';

@Directive({
    selector: '[draggable-window]',
    host: {
        '(dragstart)': 'onDragStart($event)',
        '(dragend)': 'onDragEnd($event)',
        '(drag)': 'onDrag($event)'
    }
})
export class DraggableWindow implements OnDestroy, OnInit {
    private Δx:number = 0;
    private Δy:number = 0;
    private panelEl:any;

    constructor(private panelHeaderEl:ElementRef, private renderer:Renderer2) {
        this.panelEl = this.panelHeaderEl.nativeElement.parentElement;
    }

    public ngOnInit():void {
      this.panelHeaderEl.nativeElement.setAttribute("draggable","true"); //this.renderer.setElementAttribute(this.panelHeaderEl.nativeElement, 'draggable', 'true');
    }

    onDragStart(event:MouseEvent) {
        this.Δx = event.x - this.panelEl.offsetLeft;
        this.Δy = event.y - this.panelEl.offsetTop;
    }

    onDrag(event:MouseEvent) {
        this.doTranslation(event.x, event.y);
    }

    onDragEnd(event:MouseEvent) {
        this.Δx = 0;
        this.Δy = 0;
    }

    doTranslation(x:number, y:number) {
        if (!x || !y) return;
        this.panelEl.style.top = (y - this.Δy) + 'px'; //this.renderer.setElementStyle(this.panelEl, 'top', (y - this.Δy) + 'px');
        this.panelEl.style.left = (x - this.Δx) + 'px'; //this.renderer.setElementStyle(this.panelEl, 'left', (x - this.Δx) + 'px');
    }

    public ngOnDestroy():void {
      this.panelHeaderEl.nativeElement.setAttribute("draggable","false"); //this.renderer.setElementAttribute(this.panelHeaderEl.nativeElement, 'draggable', 'false');
    }
}
