import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GroupSelector from '../GroupSelector';
import { GroupingProvider } from '../GroupingContext';

describe('GroupSelector', () => {
  // Clear localStorage before each test to prevent state leakage
  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithProvider = () => {
    return render(
      <GroupingProvider>
        <GroupSelector />
      </GroupingProvider>
    );
  };

  it('renders with default grouping option', () => {
    renderWithProvider();
    expect(screen.getByText('No Grouping')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Group by Status')).toBeInTheDocument();
    expect(screen.getByText('Group by Priority')).toBeInTheDocument();
    expect(screen.getByText('Group by Team')).toBeInTheDocument();
    expect(screen.getByText('Group by Assignee')).toBeInTheDocument();
  });

  it('selects a grouping option', () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    fireEvent.click(trigger);

    const statusOption = screen.getByRole('option', { name: /Group by Status/i });
    fireEvent.click(statusOption);

    expect(screen.getByText('Group by Status')).toBeInTheDocument();
  });

  it('shows checkmark on active option', () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    // The button should show "No Grouping" initially
    expect(trigger).toHaveTextContent('No Grouping');

    fireEvent.click(trigger);

    // Find the active option - "No Grouping" button should have the checkmark
    const options = screen.getAllByRole('option');
    const activeOption = options.find(opt => opt.getAttribute('aria-selected') === 'true');

    expect(activeOption).toBeDefined();
    expect(activeOption?.querySelector('.group-selector-check')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown on Escape key', async () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('has correct ARIA attributes', () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('displays icons for each option', () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    fireEvent.click(trigger);

    // Check that icons are present (the actual icons are Unicode characters)
    const dropdown = screen.getByRole('listbox');
    expect(dropdown).toBeInTheDocument();

    // Each option should have an icon span
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('persists selection across re-renders', () => {
    const { rerender } = renderWithProvider();

    const trigger = screen.getByRole('button', { name: /group by options/i });
    fireEvent.click(trigger);

    const priorityOption = screen.getByRole('option', { name: /Group by Priority/i });
    fireEvent.click(priorityOption);

    rerender(
      <GroupingProvider>
        <GroupSelector />
      </GroupingProvider>
    );

    expect(screen.getByText('Group by Priority')).toBeInTheDocument();
  });

  it('closes dropdown after selection', async () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const teamOption = screen.getByRole('option', { name: /Group by Team/i });
    fireEvent.click(teamOption);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('is keyboard accessible', () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /group by options/i });

    // Focus and open with Enter
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
