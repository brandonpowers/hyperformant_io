import React from 'react';

export default function RootHead() {
  return (
    <>
      <title>hyperformant</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#000000" />

      <link rel="manifest" href="/manifest.json" />
      <link
        rel="shortcut icon"
        type="image/x-icon"
        href={process.env.NEXT_PUBLIC_BASE_PATH || '' + '/favicon.ico'}
      />
      <link
        rel="icon"
        type="image/svg+xml"
        href={process.env.NEXT_PUBLIC_BASE_PATH || '' + '/favicon.svg'}
      />

      <link
        rel="apple-touch-icon"
        href={process.env.NEXT_PUBLIC_BASE_PATH || '' + '/apple-touch-icon.png'}
      />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-touch-fullscreen" content="yes" />
      <meta name="apple-mobile-web-app-title" content="hyperformant" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </>
  );
}
