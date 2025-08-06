import { NextResponse } from 'next/server';

const docsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Hyperformant API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.css" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init('/api/openapi.json', {
      theme: {
        colors: {
          primary: {
            main: '#5E35B1'
          }
        },
        typography: {
          fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5em',
          headings: {
            fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }
        },
        sidebar: {
          backgroundColor: '#fafafa'
        }
      }
    }, document.getElementById('redoc-container'));
  </script>
</body>
</html>
`;

export async function GET() {
  return new NextResponse(docsHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}