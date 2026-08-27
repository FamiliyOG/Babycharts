import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UCheckupTracker from './UCheckupTracker.jsx';

describe('React Testing Library: UCheckupTracker Component (BC-074)', () => {
  const mockChild = {
    id: 'child-test-1',
    name: 'Emma',
    gender: 'girl',
    birthdate: '2025-01-01',
  };

  const mockMeasurements = [
    {
      id: 'm-1',
      date: '2025-01-01',
      checkup: 'U1',
      weight: 3.4,
      length: 50,
      headCircumference: 35,
      notes: 'Alles super verlaufen',
    },
  ];

  it('renders checkups title, completed badge count, and checkup cards', () => {
    render(
      <UCheckupTracker
        activeChild={mockChild}
        measurements={mockMeasurements}
        onAddCheckupClick={() => {}}
      />
    );

    // Check title and counts
    expect(screen.getByText(/1 \/ 10/i)).toBeInTheDocument();
    expect(screen.getByText('U1')).toBeInTheDocument();
    expect(screen.getByText('U2')).toBeInTheDocument();
  });

  it('calls onAddCheckupClick when add checkup button is clicked', async () => {
    const handleAddClick = vi.fn();
    const user = userEvent.setup();

    render(
      <UCheckupTracker
        activeChild={mockChild}
        measurements={mockMeasurements}
        onAddCheckupClick={handleAddClick}
      />
    );

    const addBtn = screen.getByRole('button');
    expect(addBtn).toBeInTheDocument();

    await user.click(addBtn);
    expect(handleAddClick).toHaveBeenCalledTimes(1);
  });
});
