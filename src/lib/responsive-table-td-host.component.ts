import { Component, EmbeddedViewRef, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: '[responsive-table-td-host]',
  template: '<span #test2>test</span>',
})
export class ResponsiveTableTdHostComponent implements OnInit {

  @ViewChild('test1', {read: ViewContainerRef, static: true}) test1Vcr?: ViewContainerRef
  @ViewChild('test2', {read: ViewContainerRef, static: true}) test2Vcr?: ViewContainerRef

  constructor() { }

  ngOnInit(): void {

  }

  public createThComponent(thTemplateRef: TemplateRef<any>): EmbeddedViewRef<any> {
    return this.test2Vcr?.createEmbeddedView(thTemplateRef)!;
  }

}
