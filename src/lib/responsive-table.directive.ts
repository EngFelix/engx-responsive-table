import {
  AfterContentInit,
  ChangeDetectorRef,
  ComponentRef,
  ContentChildren,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
  ViewRef
} from '@angular/core';
import { TransposedRowDef, TransposedTableRowComponent } from './transposed-table-row.component';
import { ResponsiveTableRowComponent } from './responsive-table-row.component';
import { ResponsiveTableThDirective } from './responsive-table-th.directive';
import { ResponsiveTableTdDirective } from './responsive-table-td.directive';
import { BehaviorSubject, distinctUntilChanged, merge, ReplaySubject, Subject, takeUntil } from 'rxjs';

type ColState = {
  collapsed: boolean;
  thRef: ViewAndElementRef;
  tdRefs: ViewAndElementRef[];
}

type WidthState = {
  parentWidth: number;
  tableWidth: number;
  parentDirectionChange: WidthDirectionChange;
  tableDirectionChange: WidthDirectionChange;
}

enum WidthDirectionChange {
  growing, shrinking, none
}

type ViewAndElementRef = { viewRef: ViewRef, embeddedViewRef: EmbeddedViewRef<any>, viewContainerRef: ViewContainerRef };

@Directive({
  selector: 'table[responsiveTable]',
})
export class ResponsiveTableDirective implements OnInit, AfterContentInit, OnDestroy {

  @ContentChildren(ResponsiveTableThDirective, {
    read: ResponsiveTableThDirective,
    descendants: true
  }) responsiveTableThs!: QueryList<ResponsiveTableThDirective>;
  @ContentChildren(TemplateRef, {
    read: TemplateRef,
    descendants: true
  }) responsiveTableThTemplates!: QueryList<TemplateRef<any>>;
  @ContentChildren(ResponsiveTableRowComponent, {
    read: ResponsiveTableRowComponent,
    descendants: true
  }) responsiveTableRows!: QueryList<ResponsiveTableRowComponent>;
  @ContentChildren(ResponsiveTableTdDirective, {
    read: ResponsiveTableTdDirective,
    descendants: true
  }) responsiveTableTds!: QueryList<ResponsiveTableTdDirective>;

  transposedTableRowComponentRefs: ComponentRef<TransposedTableRowComponent>[] = [];

  @Input() doNotTransformLastColumn = false;
  @Input() transposedRowCollapsedCaretIconClass = 'fa-toggle-right';
  @Input() transposedRowExpandedCaretIconClass = 'fa-toggle-down';

  colStates: ColState[] = [];
  firstTdsWithCaret: { tdElement: HTMLElement, caretElement: HTMLElement }[] = [];
  widthBreakpoints: number[] = [];
  totalColumnCount = -1;
  visibleColumnCount = -1;
  nextColumnIdxToRemove = -1;
  maxColumnIdxToRemove = -1;

  tableNode: any;
  parentNode: any;

  widthMargin = 100;
  widthStateChanged$!: BehaviorSubject<WidthState>;
  transpositionStateChange$ = new Subject<'transposed' | 'default'>();
  reinitialize$ = new Subject();
  destroyed$ = new ReplaySubject(1);

  constructor(private renderer: Renderer2,
              private cd: ChangeDetectorRef,
              elementRef: ElementRef) {

    this.tableNode = elementRef.nativeElement;
    this.parentNode = elementRef.nativeElement.parentNode;

  }

  ngOnInit(): void {

    this.setUpResizeObserverAndWidthStateChange();
    this.setUpDynamicResizingOnWidthStateChange();
  }

  private setUpResizeObserverAndWidthStateChange() {

    const initialWidthDirectionChange = this.tableNode.offsetWidth > this.parentNode.offsetWidth ?
      WidthDirectionChange.shrinking : WidthDirectionChange.none;

    this.widthStateChanged$ = new BehaviorSubject<WidthState>({
      tableWidth: this.tableNode.offsetWidth,
      parentWidth: this.parentNode.offsetWidth,
      tableDirectionChange: initialWidthDirectionChange,
      parentDirectionChange: initialWidthDirectionChange,
    });

    new ResizeObserver(entries => {
      for (let entry of entries) {

        const previousWidthState = this.widthStateChanged$.getValue();

        this.widthStateChanged$.next({
          parentWidth: entry.contentRect.width,
          tableWidth: this.tableNode.offsetWidth,
          parentDirectionChange: this.getWidthStateChangeDirection(previousWidthState.parentWidth, entry.contentRect.width),
          tableDirectionChange: this.getWidthStateChangeDirection(previousWidthState.tableWidth, this.tableNode.offsetWidth),
        });
      }
    }).observe(this.parentNode);
  }

  private getWidthStateChangeDirection(previousWidth: number, currentWidth: number): WidthDirectionChange {

    if (currentWidth < previousWidth) {
      return WidthDirectionChange.shrinking;
    }

    if (currentWidth > previousWidth) {
      return WidthDirectionChange.growing;
    }

    return WidthDirectionChange.none;
  }

  private setUpDynamicResizingOnWidthStateChange() {
    this.widthStateChanged$
      .pipe(
        takeUntil(this.destroyed$),
        distinctUntilChanged()
      )
      .subscribe(widthState => {

        switch (widthState.parentDirectionChange) {

          case WidthDirectionChange.shrinking:

            if (widthState.tableWidth - this.widthMargin > widthState.parentWidth) {
              this.widthBreakpoints[this.nextColumnIdxToRemove] = widthState.parentWidth;
              this.transposeColumn(this.nextColumnIdxToRemove);
              this.widthStateChanged$.next({...widthState, tableWidth: this.tableNode.offsetWidth});
            }
            break;

          case WidthDirectionChange.growing:

            if (widthState.parentWidth - this.widthMargin > this.widthBreakpoints[this.nextColumnIdxToRemove + 1]) {
              this.transposeColumn(this.nextColumnIdxToRemove + 1);
              this.widthStateChanged$.next({...widthState, tableWidth: this.tableNode.offsetWidth});
            }
            break;
        }
      });
  }

  ngAfterContentInit(): void {

    this.responsiveTableTds?.changes
      .pipe(takeUntil(this.destroyed$))
      .subscribe(tdsVcrs => {

        console.log('tdVcrs changed: Reinitializing', tdsVcrs);

        this.reinitialize();

        this.widthStateChanged$.next({
          ...this.widthStateChanged$.getValue(),
          tableWidth: this.tableNode.offsetWidth,
          parentDirectionChange: WidthDirectionChange.shrinking,
        });

      });

    this.initialize();

  }

  private initialize() {

    if (this.responsiveTableRows?.length! < 3) {
      throw new Error('Cannot build a Responsive Table with less than 3 rows. Found ' + this.responsiveTableRows?.length);
    }
    if (this.responsiveTableThs?.length! < 3) {
      throw new Error('Cannot build a Responsive Table with less than 3 ths. Found ' + this.responsiveTableRows?.length);
    }
    if (this.responsiveTableTds?.length! < 3) {
      throw new Error('Cannot build a Responsive Table with less than 3 tds. Found ' + this.responsiveTableRows?.length);
    }

    this.colStates = [];
    this.transposedTableRowComponentRefs = [];

    this.totalColumnCount = this.responsiveTableThs.length;
    this.visibleColumnCount = this.totalColumnCount;
    this.maxColumnIdxToRemove = this.doNotTransformLastColumn ? this.totalColumnCount - 2 : this.totalColumnCount - 1;
    this.nextColumnIdxToRemove = this.maxColumnIdxToRemove;

    // init ColStates
    for (let colIdx = 0; colIdx < this.totalColumnCount; colIdx++) {

      const thVcr = this.responsiveTableThs.get(colIdx)!.getViewContainerRef();

      if (!thVcr) {
        throw new Error(`thViewContainerRef was undefined!! colIdx (${colIdx})`);
      }

      const colState: ColState = {
        collapsed: false,
        thRef: {
          viewRef: this.responsiveTableThs.get(colIdx)!.getViewRef(),
          embeddedViewRef: this.responsiveTableThs.get(colIdx)!.getEmbeddedViewRef(),
          viewContainerRef: thVcr,
        },
        tdRefs: [],
      };

      for (let rowIdx = 0; rowIdx < this.responsiveTableRows.length; rowIdx++) {

        const tdDirective = this.responsiveTableTds.get(this.totalColumnCount * rowIdx + colIdx)!;
        colState.tdRefs.push({
          viewRef: tdDirective.getViewRef(),
          embeddedViewRef: tdDirective.getEmbeddedViewRef(),
          viewContainerRef: tdDirective.getViewContainerRef()
        });

      }

      this.colStates.push(colState);
    }

    //init widthBreakpoints
    this.widthBreakpoints = new Array(this.colStates.length).fill(-1);

    this.firstTdsWithCaret = [];

    // create expand/collapse carets
    for (let rowIdx = 0; rowIdx < this.responsiveTableRows.length; rowIdx++) {

      const tdElement = this.responsiveTableTds.get(rowIdx * this.colStates.length)!.getEmbeddedViewRef().rootNodes[0];
      const caretElement = this.renderer.createElement('span');
      this.renderer.addClass(caretElement, 'fa');
      this.renderer.addClass(caretElement, this.transposedRowCollapsedCaretIconClass);
      this.renderer.setStyle(caretElement, 'display', 'none');
      this.renderer.listen(caretElement, 'click', () => {
        if (this.transposedTableRowComponentRefs[rowIdx].instance.toggleVisibility()) {
          this.renderer.removeClass(caretElement, this.transposedRowCollapsedCaretIconClass);
          this.renderer.addClass(caretElement, this.transposedRowExpandedCaretIconClass);
        } else {
          this.renderer.removeClass(caretElement, this.transposedRowExpandedCaretIconClass);
          this.renderer.addClass(caretElement, this.transposedRowCollapsedCaretIconClass);
        }
      });
      this.renderer.insertBefore(tdElement, caretElement, tdElement.childNodes[0]);
      this.firstTdsWithCaret.push({tdElement: tdElement, caretElement: caretElement});

    }

    this.transpositionStateChange$
      .pipe(takeUntil(merge(this.reinitialize$, this.destroyed$)))
      .subscribe(transpositionState => {
        if (transpositionState === 'default') {
          this.firstTdsWithCaret.forEach(firstTdWithCaret => {
            this.renderer.setStyle(firstTdWithCaret.caretElement, 'display', 'none');
          });
        } else {
          this.firstTdsWithCaret.forEach(firstTdWithCaret => {
            this.renderer.setStyle(firstTdWithCaret.caretElement, 'display', 'initial');
            if (firstTdWithCaret.caretElement.classList.contains(this.transposedRowExpandedCaretIconClass)) {
              this.renderer.removeClass(firstTdWithCaret.caretElement, this.transposedRowExpandedCaretIconClass);
              this.renderer.addClass(firstTdWithCaret.caretElement, this.transposedRowCollapsedCaretIconClass);
            }
          });
        }
      });

  }

  private reinitialize() {

    this.reinitialize$.next(null);

    this.colStates.forEach((colState: ColState, colIdx: number) => {
      if (colState.collapsed) {
        this.transposeColumn(colIdx);
      }
    });

    this.transposedTableRowComponentRefs.forEach(v => v.destroy());
    this.firstTdsWithCaret.forEach(firstTdsWithCaret => {
      this.renderer.removeChild(firstTdsWithCaret.tdElement, firstTdsWithCaret.caretElement);
    });

    this.initialize();
  }

  private transposeColumn(colIdx: number) {

    if (colIdx == 0) {
      throw new Error('Trying to transpose first column! This is not supported');
    }
    if (colIdx == this.totalColumnCount - 1 && this.doNotTransformLastColumn) {
      throw new Error('Trying to transpose last column, although "doNotTransformLastColumn" is set to true!');
    }

    console.debug('transposing column with idx ' + colIdx);

    const colState = this.colStates[colIdx];

    if (colState.collapsed) {

      this.transposedTableRowComponentRefs.forEach((transposedTableRowComponent: ComponentRef<TransposedTableRowComponent>, rowIdx: number) => {

        transposedTableRowComponent.instance.hide(colIdx);

        const responsiveTableTdDirective = this.responsiveTableTds.get(this.totalColumnCount * rowIdx + colIdx);

        responsiveTableTdDirective?.getViewContainerRef().insert(responsiveTableTdDirective?.getEmbeddedViewRef());

        if (this.maxColumnIdxToRemove === colIdx) {
          transposedTableRowComponent.destroy();
        }
      });

      if (this.maxColumnIdxToRemove === colIdx) {
        this.transposedTableRowComponentRefs = [];
      }

      this.renderer.setStyle(this.responsiveTableThs.get(colIdx)?.getEmbeddedViewRef().rootNodes[0], 'display', 'table-cell');

      this.visibleColumnCount++;
      this.nextColumnIdxToRemove++;

    } else {

      if (this.transposedTableRowComponentRefs.length === 0) {
        // create new table row components
        this.createEmptyTransposedTableRowComponents();

      }

      this.transposedTableRowComponentRefs.forEach((transposedTableRowComponent: ComponentRef<TransposedTableRowComponent>) => {
        transposedTableRowComponent.instance.show(colIdx);
      });


      this.renderer.setStyle(this.responsiveTableThs.get(colIdx)?.getEmbeddedViewRef().rootNodes[0], 'display', 'none');

      this.visibleColumnCount--;
      this.nextColumnIdxToRemove--;

    }

    colState.collapsed = !colState.collapsed;

    this.cd.detectChanges();

    if (this.maxColumnIdxToRemove === colIdx) {
      this.transpositionStateChange$.next(colState.collapsed ? 'transposed' : 'default');
    }

  }

  private createEmptyTransposedTableRowComponents(): void {

    this.transposedTableRowComponentRefs = this.responsiveTableRows.map((trDirective: ResponsiveTableRowComponent, rowIdx: number) => {

        const transposedTableRowComponent = trDirective.getViewContainerRef().createComponent(TransposedTableRowComponent);

        const totalTransposedRows: TransposedRowDef[] = [];

        for (let i = 0; i < this.colStates.length; i++) {
          totalTransposedRows.push({
            thTemplateRef: this.responsiveTableThTemplates.get(i)!,
            tdViewRef: this.colStates[i].tdRefs[rowIdx].viewContainerRef.get(0)!,
            show: false,
          });
        }

        transposedTableRowComponent.instance.transposedRowDefs = totalTransposedRows;

        return transposedTableRowComponent;
      }
    );
  }

  ngOnDestroy(): void {
    this.destroyed$.next(null);
    this.destroyed$.complete();
    this.reinitialize$.complete();
  }

}
