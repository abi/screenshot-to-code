// src/CodeViewer.tsx
import React, { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { sharedProps, sharedOptions, sharedFiles } from './sharedConfig';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from '@codesandbox/sandpack-react';

console.log(SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview);


// Define a fallback component for Suspense
const Loading = () => <div>Loading code viewer...</div>;

interface CodeViewerProps {
  code: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code }) => {
  const [SandpackProvider, setSandpackProvider] = useState<React.ComponentType<any> | null>(null);
  const [SandpackLayout, setSandpackLayout] = useState<React.ComponentType<any> | null>(null);
  const [SandpackCodeEditor, setSandpackCodeEditor] = useState<React.ComponentType<any> | null>(null);
  const [SandpackPreview, setSandpackPreview] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    const loadSandpackComponents = async () => {
      try {
        const {
          SandpackProvider,
          SandpackLayout,
          SandpackCodeEditor,
          SandpackPreview,
        } = await import('@codesandbox/sandpack-react');
        
        setSandpackProvider(() => SandpackProvider);
        setSandpackLayout(() => SandpackLayout);
        setSandpackCodeEditor(() => SandpackCodeEditor);
        setSandpackPreview(() => SandpackPreview);
      } catch (error) {
        console.error("Failed to load Sandpack components", error);
        setLoadError(error as Error);
      }
    };

    loadSandpackComponents();
  }, []);

  if (loadError) {
    return <div>Failed to load the code viewer.</div>;
  }

  if (!SandpackProvider || !SandpackLayout || !SandpackCodeEditor || !SandpackPreview) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <SandpackProvider
        {...sharedProps}
        files={{
          ...sharedFiles,
          '/App.tsx': {
            code,
          },
        }}
        options={sharedOptions}
      >
        <SandpackLayout style={{ height: '80vh' }}> {/* Increase the height to 80vh */}
          <SandpackCodeEditor
            showLineNumbers
            showTabs={false}
            closableTabs={false}
            style={{ height: '100%' }} // Ensure it takes full height
          />
          <SandpackPreview style={{ height: '100%' }} /> {/* Ensure it takes full height */}
        </SandpackLayout>
      </SandpackProvider>
    </ErrorBoundary>
  );
};

export default CodeViewer;
