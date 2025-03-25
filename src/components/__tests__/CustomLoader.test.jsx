import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomLoader } from '../CustomLoader';

// Mock the drei Loader component
vi.mock('@react-three/drei', () => ({
  Loader: vi.fn().mockImplementation(() => <div data-testid="mock-loader"></div>)
}));

describe('CustomLoader', () => {
  it('should render the default drei Loader', () => {
    render(<CustomLoader />);
    expect(screen.getByTestId('mock-loader')).toBeInTheDocument();
  });
}); 