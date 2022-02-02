import * as jsPDF from 'jspdf'
import 'jspdf-autotable'
import canvg from 'canvg'
import { ErrorHelper } from '../error-helper';
import assert from 'assert';

const gbClinicalGreen = [51, 156, 144]
const exceptionColor = [245, 223, 181]

export class PDF {
  _jsPDF: jsPDF.jsPDF

  private columnsLastElementY: number[]




  constructor(
    public readonly nbOfColumns: number = 1, //specifies the number of columns within one page of the pdf (as in columns of a table)
    private columnsMargin = 15, // margin between elements of the same row
    private verticalMarginTable: number = 7,
    private verticalMarginImage: number = 7,
    private verticalMarginText: number = -6,
    private horizontalMargin: number = 14,
    private headersSize: number = 14,
    private contentSize: number = 8,
    private topMargin: number = 10) {

    this.columnsLastElementY = []
    for (let i = 0; i < nbOfColumns; i++) {
      this.columnsLastElementY.push(this.topMargin) // initiliazing the space occupied in each column.
    }

    this._jsPDF = new jsPDF.jsPDF()
    this._jsPDF.setFont('Helvetica')
    this._jsPDF.setFontSize(this.headersSize)

    assert(this.spaceOccupiedByPreviousRows(nbOfColumns, true) <= this.getWidth())
  }

  getColumnWidth(): number {
    return (this.getWidth() - this.horizontalMargin) / this.nbOfColumns - this.columnsMargin
  }

  getWidth() {
    return this._jsPDF.internal.pageSize.getWidth()
  }


  //space occupied horizontally by previous rows. @param columnIndex: index of the current column
  private spaceOccupiedByPreviousRows(columnIndex: number, removeAssertion: boolean = false) {
    if (!removeAssertion) {
      assert(columnIndex < this.nbOfColumns)
    }
    return columnIndex * (this.getColumnWidth() + this.columnsMargin)
  }

  /*
  * @param columnIndex defines the columns at which the element will be appended within the current page of the pdf
  */
  addImageFromDataURL(imData: any, x0?: number, y0?: number, width?: number, height?: number, columnIndex: number = 0) {
    assert(columnIndex < this.nbOfColumns)

    const lastElementY = this.columnsLastElementY[columnIndex]
    const occupiedByPreviousRows = this.spaceOccupiedByPreviousRows(columnIndex)

    const x = occupiedByPreviousRows + x0
    const y = y0 + lastElementY

    try {
      this._jsPDF.addImage(imData, 'png', x, y, width, height)
    } catch (err) {
      throw ErrorHelper.handleError('during exportation of canvas data to PDF document', err)
    }

    console.log('Exported to PDF.')


    //TODO if the current column is bigger than the current page size, go the next page to print the content
    this.columnsLastElementY[columnIndex] += height + this.verticalMarginImage
  }

  addImage(sourceSVGRef: any, targetCanvasRef: any, x0: number, y0: number, x1: number, y1: number) {
    console.log('Parsing SVG')
    let serializer = new XMLSerializer();
    let svgSerialized: string
    try {
      svgSerialized = serializer.serializeToString(sourceSVGRef);
    } catch (err) {
      throw ErrorHelper.handleError('during serialzation of SVG data', err)
    }


    // export image from vectorial to raster format
    console.log('SVG parsed. Writing to canvas.')
    try {
      canvg(targetCanvasRef, svgSerialized, { useCORS: true })
    } catch (err) {
      throw ErrorHelper.handleError('during export of SVG data to raster data', err)
    }

    let imData: any
    console.log('Canvas written. Exporting to PNG format.')
    try {
      imData = targetCanvasRef.toDataURL('img/png', 'high')
    } catch (err) {
      throw ErrorHelper.handleError('while parsing canvas ref', err)
    }
    console.log('PNG data written. Exporting to PDF')

    this.addImageFromDataURL(imData, x0, y0, x1, y1)
  }

  addTableFromObjects(headers: string[][], data: string[][], bodyColor = null, columnIndex: number = 0) {
    try {
      (this._jsPDF as any).autoTable({
        head: headers,
        body: data,
        headStyles: {
          fillColor: gbClinicalGreen,
        },
        bodyStyles: {
          fillColor: bodyColor,
        },
        startY: this.columnsLastElementY[columnIndex],
      })
    } catch (err) {
      throw ErrorHelper.handleError('while adding table to PDF document', err)
    }
    this.columnsLastElementY[columnIndex] = (this._jsPDF as any).lastAutoTable.finalY + this.verticalMarginTable
  }

  addTableFromHTMLRef(htmlRef: string, bodyColor = null, columnIndex: number = 0) {
    try {
      (this._jsPDF as any).autoTable({
        html: htmlRef,
        startY: this.columnsLastElementY[columnIndex],
        headStyles: {
          fillColor: gbClinicalGreen,
        },
        bodyStyles: {
          fillColor: bodyColor,
        },
      })
    } catch (err) {
      throw ErrorHelper.handleError('while adding table to PDF document from HTML reference', err)
    }
    this.columnsLastElementY[columnIndex] = (this._jsPDF as any).lastAutoTable.finalY + this.verticalMarginTable
  }

  addOneLineText(txt: string, columnIndex: number = 0) {
    this._jsPDF.setFontSize(this.headersSize)
    this._jsPDF.text(txt, this.horizontalMargin, this.columnsLastElementY[columnIndex])
    this.columnsLastElementY[columnIndex] += this._jsPDF.getFontSize() + this.verticalMarginText
  }

  addContentText(txt: string[]) {
    if ((txt) && txt.length !== 0) {
      let body = new Array<string[]>();
      txt.forEach(entry => {
        let newRow = new Array<string>()
        newRow.push(entry)
        body.push(newRow)
      })
      this.addTableFromObjects(null, body, exceptionColor)
    }
  }

  export(fileName: string) {
    try {
      this._jsPDF.save(fileName)
    } catch (err) {
      throw ErrorHelper.handleError('while saving PDF file', err)
    }
  }
}
