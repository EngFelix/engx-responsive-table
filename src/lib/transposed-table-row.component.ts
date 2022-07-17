import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  QueryList,
  Renderer2,
  TemplateRef,
  ViewChildren,
  ViewContainerRef,
  ViewRef
} from '@angular/core';

export type TransposedRowDef = {
  thTemplateRef: TemplateRef<any>;
  tdViewRef: ViewRef;
  show: boolean;
}

@Component({
  selector: 'tr[transposed-table-row]',
  templateUrl: './transposed-table-row.component.html',
})
export class TransposedTableRowComponent implements OnInit, AfterViewInit {

  @ViewChildren('td', {read: ViewContainerRef}) tdViewContainerRefs!: QueryList<ViewContainerRef>;

  /**
   * 'backwards' is the default and assumes that the columns will shrink from the least to the most significant column.
   * (from right to left). This strategy is preferred, since it is faster.
   * If 'arbitrary' strategy is used, computation is a bit heavier, but columns can disappear in any order.
   */
  @Input() transpositionOrderStrategy: 'backwards' | 'arbitrary' = 'backwards';
  @Input() transposedRowDefs: TransposedRowDef[] = [];

  visible = false;

  constructor(private cd: ChangeDetectorRef,
              private elementRef: ElementRef,
              private renderer: Renderer2) { }

  ngOnInit(): void {
    console.log('initting transposed row!!');
    this.setHostDisplay('collapse');
  }

  ngAfterViewInit(): void {
    console.log(' transposed row after view init hook!!');
  }

  // returns true if row is visible after this operation
  public toggleVisibility(): boolean {
    if (this.visible) {
      this.setHostDisplay('collapse');
    } else {
      this.setHostDisplay('visible');
    }
    this.visible = !this.visible;
    return this.visible;
  }

  private setHostDisplay(display: 'collapse' | 'visible') {
    console.debug('Setting Visibility of host to ' + display)
    this.renderer.setStyle(this.elementRef.nativeElement, 'visibility', display);
  }


  public show(colIdx: number): void {

    // we assume, that we always want to insert last.

    const transposedRowDef = this.transposedRowDefs[colIdx];

    transposedRowDef.show = true;

    this.cd.detectChanges();

    const ngForIdx = this.transpositionOrderStrategy === 'backwards' ? 0 : this.determineNgForIdxForInsertion(colIdx);

    if (this.tdViewContainerRefs.get(ngForIdx)?.length === 0) {

      // this is the magic. We are inserting the same view for the td as in the original table, with correct data
      // binding and events. We could create a copy using the same technique as above... not sure what is better here.
      this.tdViewContainerRefs.get(ngForIdx)?.insert(transposedRowDef.tdViewRef);

    }

  }

  public hide(colIdx: number): void {

    this.transposedRowDefs[colIdx].show = false;

  }

  private determineNgForIdxForInsertion(colIdx: number): number {

    let ngForIdx = 0;

    for (let i = 0; i < colIdx; i++) {
      if (this.transposedRowDefs[i].show) {
        ngForIdx++;
      }
    }

    return ngForIdx;

  }

}
