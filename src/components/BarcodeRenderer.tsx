import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  width = 1.3,
  height = 40,
  displayValue = true,
  fontSize = 10,
  margin = 2,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('JsBarcode failed to render:', err, 'for value:', value);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  return (
    <div className="flex justify-center items-center bg-white p-1 rounded">
      <svg ref={svgRef} className="mx-auto" />
    </div>
  );
};
