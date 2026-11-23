import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadingForm from '../ReadingForm';

// Bonus task: React Testing Library tests for the reading form.
// The API is mocked at the fetch level.

beforeEach(() => {
  localStorage.setItem('sweety_token', 'fake-token');
  vi.restoreAllMocks();
});

function mockFetchOnce(status, body) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

test('shows the API validation error when the slot is already taken', async () => {
  mockFetchOnce(400, { error: 'You already have an After lunch reading for this date.' });
  render(<ReadingForm editing={null} onSaved={() => {}} onCancel={() => {}} />);

  await userEvent.selectOptions(screen.getByLabelText(/Time slot/), 'after_lunch');
  await userEvent.type(screen.getByLabelText(/Value/), '130');
  await userEvent.click(screen.getByRole('button', { name: /add reading/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'You already have an After lunch reading for this date.'
  );
});

test('submits a valid reading and notifies the parent', async () => {
  const fetchSpy = mockFetchOnce(201, { id: 1, date: '2026-10-15', slot: 'morning_fasting', value: 110 });
  const onSaved = vi.fn();
  render(<ReadingForm editing={onSaved && null} onSaved={onSaved} onCancel={() => {}} />);

  await userEvent.type(screen.getByLabelText(/Value/), '110');
  await userEvent.click(screen.getByRole('button', { name: /add reading/i }));

  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  const [, options] = fetchSpy.mock.calls[0];
  expect(JSON.parse(options.body)).toMatchObject({ slot: 'morning_fasting', value: 110 });
});

test('edit mode saves with PUT and shows the reading values', async () => {
  const fetchSpy = mockFetchOnce(200, { id: 7, date: '2026-10-15', slot: 'after_lunch', value: 145 });
  const editing = { id: 7, date: '2026-10-15', slot: 'after_lunch', value: 140 };
  render(<ReadingForm editing={editing} onSaved={() => {}} onCancel={() => {}} />);

  const valueInput = screen.getByLabelText(/Value/);
  expect(valueInput).toHaveValue(140);
  await userEvent.clear(valueInput);
  await userEvent.type(valueInput, '145');
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  const [url, options] = fetchSpy.mock.calls[0];
  expect(url).toContain('/readings/7');
  expect(options.method).toBe('PUT');
});
