declare module 'html-to-docx' {
  type Margins = {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    header?: number | string;
    footer?: number | string;
    gutter?: number | string;
  };

  export interface HtmlToDocxOptions {
    orientation?: 'portrait' | 'landscape';
    margins?: Margins;
    [key: string]: unknown;
  }

  function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString: string | null,
    documentOptions?: HtmlToDocxOptions,
    footerHTMLString?: string | null,
  ): Promise<Buffer | Blob | ArrayBuffer | Uint8Array>;

  export default HTMLtoDOCX;
}
