import {
  ChangeDetectorRef,
  Directive,
  EmbeddedViewRef,
  Inject,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  ViewRef
} from '@angular/core';

@Directive({
  selector: '[responsiveTableTh]'
})
export class ResponsiveTableThDirective implements OnInit{

  embeddedViewRef?: EmbeddedViewRef<any>;

  constructor(@Inject(ChangeDetectorRef) private viewRef: ViewRef,
              private viewContainerRef: ViewContainerRef,
              private templateRef: TemplateRef<any>) {
  }

  ngOnInit(): void {
    this.embeddedViewRef = this.viewContainerRef.createEmbeddedView(this.templateRef);
  }

  public getViewRef(): ViewRef {
    return this.viewRef;
  }

  public getEmbeddedViewRef(): EmbeddedViewRef<any> {
    return this.embeddedViewRef!;
  }

  public getViewContainerRef(): ViewContainerRef {
    return this.viewContainerRef;
  }

}
