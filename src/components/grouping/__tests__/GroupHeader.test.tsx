import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupHeader from '../GroupHeader';
import { GroupingProvider } from '../GroupingContext';

describe('GroupHeader', () => {
  // Clear localStorage before each test to prevent state leakage
  beforeEach(() => {
    localStorage.clear();
  });

  const defaultProps = {
    groupId: 'test-group',
    groupLabel: 'Test Group',
    itemCount: 10,
  };

  const renderWithProvider = (props = {}) => {
    return render(
      <GroupingProvider>
        <GroupHeader {...defaultProps} {...props} />
      </GroupingProvider>
    );
  };

  describe('Rendering', () => {
    it('renders group label and count', () => {
      renderWithProvider();

      expect(screen.getByText('Test Group')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('renders completed count when provided', () => {
      renderWithProvider({ completedCount: 5 });

      expect(screen.getByText('5 done')).toBeInTheDocument();
    });

    it('renders progress bar when progressPercent is provided', () => {
      renderWithProvider({ progressPercent: 50 });

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = renderWithProvider({ className: 'custom-class' });

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('renders swimlane variant', () => {
      const { container } = renderWithProvider({ variant: 'swimlane' });

      expect(container.querySelector('.swimlane')).toBeInTheDocument();
    });
  });

  describe('Collapse/Expand', () => {
    it('toggles collapse state on click', () => {
      renderWithProvider();

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(header);

      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('calls custom onToggleCollapse when provided', () => {
      const onToggleCollapse = vi.fn();
      renderWithProvider({ onToggleCollapse });

      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(onToggleCollapse).toHaveBeenCalledWith('test-group');
    });

    it('uses controlled isCollapsed when provided', () => {
      renderWithProvider({ isCollapsed: true });

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles on Enter key', () => {
      renderWithProvider();

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(header, { key: 'Enter' });

      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles on Space key', () => {
      renderWithProvider();

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(header, { key: ' ' });

      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('does not toggle on other keys', () => {
      renderWithProvider();

      const header = screen.getByRole('button');
      const initialExpanded = header.getAttribute('aria-expanded');

      fireEvent.keyDown(header, { key: 'a' });

      expect(header).toHaveAttribute('aria-expanded', initialExpanded);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderWithProvider();

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('tabIndex', '0');
      expect(header).toHaveAttribute('aria-expanded');
      expect(header).toHaveAttribute('aria-label');
    });

    it('updates aria-expanded with collapse state', () => {
      renderWithProvider();

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(header);

      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('is keyboard focusable', () => {
      renderWithProvider();

      const header = screen.getByRole('button');
      header.focus();

      expect(document.activeElement).toBe(header);
    });
  });

  describe('Progress Display', () => {
    it('calculates and displays progress bar correctly', () => {
      renderWithProvider({ progressPercent: 75 });

      // Check that progress is displayed
      const progressText = screen.getByText('75%');
      expect(progressText).toBeInTheDocument();
    });

    it('clamps progress to 0-100 range', () => {
      const { container } = renderWithProvider({ progressPercent: 150 });

      const progressFill = container.querySelector('.group-header-progress-fill');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('handles negative progress values', () => {
      const { container } = renderWithProvider({ progressPercent: -10 });

      const progressFill = container.querySelector('.group-header-progress-fill');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('displays completed count alongside progress', () => {
      renderWithProvider({ completedCount: 7, progressPercent: 70 });

      expect(screen.getByText('7 done')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('applies correct classes based on collapse state', () => {
      const { container, rerender } = renderWithProvider({ isCollapsed: false });

      let header = container.querySelector('.group-header');
      expect(header).toHaveClass('expanded');
      expect(header).not.toHaveClass('collapsed');

      rerender(
        <GroupingProvider>
          <GroupHeader {...defaultProps} isCollapsed={true} />
        </GroupingProvider>
      );

      header = container.querySelector('.group-header');
      expect(header).toHaveClass('collapsed');
      expect(header).not.toHaveClass('expanded');
    });

    it('rotates chevron icon based on collapse state', () => {
      // Use uncontrolled mode (no isCollapsed prop) so clicks work
      const { container } = renderWithProvider();

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      let chevron = container.querySelector('.group-header-chevron');
      expect(chevron).toHaveClass('expanded');

      // Click to collapse
      fireEvent.click(header);

      // After clicking, aria-expanded should be false
      expect(header).toHaveAttribute('aria-expanded', 'false');

      // Re-query the chevron - it should now have collapsed class
      chevron = container.querySelector('.group-header-chevron');
      expect(chevron).not.toBeNull();
      // The chevron classes toggle with the collapse state
      expect(chevron?.classList.contains('collapsed')).toBe(true);
    });
  });
});
