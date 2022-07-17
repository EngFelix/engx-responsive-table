import { Component, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'tr[responsiveTableRow]',
  template: '<ng-content></ng-content>'
})
export class ResponsiveTableRowComponent {

  constructor(private viewContainerRef: ViewContainerRef) {
  }

  public getViewContainerRef(): ViewContainerRef {
    return this.viewContainerRef;
  }

}
