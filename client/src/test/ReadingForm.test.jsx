import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadingForm, { validate } from '../ReadingForm';

// React Testing Library tests for the reading form. fetch is mocked per URL:
// the form loads the chosen day's readings, then POSTs / PUTs on submit.

const DAY = '2026-10-15';

function mockApi({ dayReadings = [], submit = { status: 201, body: {} } } = {}) {
  return vi.spyOn(global, 'fetch').mockImplementation(async (url, options = {}) => {
    const method = options.method || 'GET';
    const reply = method === 'GET'
      ? { status: 200, body: { data: dayReadings } }
      : submit;
    return {
      status: reply.status,
      ok: reply.status >= 200 && reply.status < 300,
      json: async () => reply.body,
    };
  });
}

const submitCalls = (spy) => spy.mock.calls.filter(([, o]) => o && o.method && o.method !== 'GET');

beforeEach(() => {
  localStorage.setItem('sweety_token', 'fake-token');
  vi.restoreAllMocks();
});

test('shows "Please enter a glucose value." and does not submit an empty value', async () => {
  const spy = mockApi();
  render(<ReadingForm editing={null} initialDate={DAY} onSaved={() => {}} />);

  await userEvent.click(screen.getByRole('button', { name: /add reading/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a glucose value.');
  expect(submitCalls(spy)).toHaveLength(0);
});

test('rejects values outside 40-600', async () => {
  mockApi();
  render(<ReadingForm editing={null} initialDate={DAY} onSaved={() => {}} />);

  await userEvent.type(screen.getByLabelText(/glucose value/i), '700');
  await userEvent.click(screen.getByRole('button', { name: /add reading/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Value must be between 40 and 600 mg/dl.');
});

test('marks slots already logged that day and blocks a duplicate', async () => {
  mockApi({ dayReadings: [{ id: 3, date: DAY, slot: 'after_lunch', value: 140 }] });
  render(<ReadingForm editing={null} initialDate={DAY} initialSlot="morning_fasting" onSaved={() => {}} />);

  expect(await screen.findByText('Logged · 140')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: /after lunch/i }));
  await userEvent.type(screen.getByLabelText(/glucose value/i), '130');
  await userEvent.click(screen.getByRole('button', { name: /add reading/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'You already have an After lunch reading for this date.'
  );
});

test('submits a valid reading and notifies the parent', async () => {
  const spy = mockApi({ submit: { status: 201, body: { id: 1, date: DAY, slot: 'morning_fasting', value: 110 } } });
  const onSaved = vi.fn();
  render(<ReadingForm editing={null} initialDate={DAY} initialSlot="morning_fasting" onSaved={onSaved} />);

  await userEvent.type(screen.getByLabelText(/glucose value/i), '110');
  expect(screen.getByText('In range')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /add reading/i }));

  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  const [url, options] = submitCalls(spy)[0];
  expect(url).toMatch(/\/api\/readings$/);
  expect(JSON.parse(options.body)).toEqual({ date: DAY, slot: 'morning_fasting', value: 110 });
});

test('shows the error message the API returns', async () => {
  mockApi({ submit: { status: 400, body: { error: 'Date cannot be in the future.' } } });
  render(<ReadingForm editing={null} initialDate={DAY} initialSlot="after_dinner" onSaved={() => {}} />);

  await userEvent.type(screen.getByLabelText(/glucose value/i), '120');
  await userEvent.click(screen.getByRole('button', { name: /add reading/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Date cannot be in the future.');
});

test('edit mode loads the reading and saves with PUT', async () => {
  const spy = mockApi({ submit: { status: 200, body: { id: 7, date: DAY, slot: 'after_lunch', value: 145 } } });
  const editing = { id: 7, date: DAY, slot: 'after_lunch', value: 140 };
  render(<ReadingForm editing={editing} onSaved={() => {}} onDeleted={() => {}} />);

  const input = screen.getByLabelText(/glucose value/i);
  expect(input).toHaveValue(140);
  expect(screen.getByRole('radio', { name: /after lunch/i })).toBeChecked();
  await userEvent.clear(input);
  await userEvent.type(input, '145');
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  await waitFor(() => expect(submitCalls(spy)).toHaveLength(1));
  const [url, options] = submitCalls(spy)[0];
  expect(url).toContain('/readings/7');
  expect(options.method).toBe('PUT');
});

test('delete asks for confirmation before calling the API', async () => {
  const spy = mockApi({ submit: { status: 204, body: null } });
  const onDeleted = vi.fn();
  const editing = { id: 9, date: DAY, slot: 'after_dinner', value: 160 };
  render(<ReadingForm editing={editing} onSaved={() => {}} onDeleted={onDeleted} />);

  await userEvent.click(screen.getByRole('button', { name: /delete reading/i }));
  expect(submitCalls(spy)).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

  await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  expect(submitCalls(spy)[0][1].method).toBe('DELETE');
});

describe('validate() mirrors the API rules', () => {
  const ok = { date: DAY, slot: 'morning_fasting', value: '100' };

  test('future dates are rejected', () => {
    expect(validate({ ...ok, date: '2026-10-16' }, [], DAY)).toBe('Date cannot be in the future.');
  });

  test('decimals are rejected', () => {
    expect(validate({ ...ok, value: '100.5' }, [], DAY)).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test('a fifth reading on a full day is rejected', () => {
    const taken = ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner'];
    expect(validate(ok, taken, DAY)).toBe('You already have a Morning (fasting) reading for this date.');
    expect(validate({ ...ok, slot: 'other' }, taken, DAY)).toBe('You can add only 4 readings per day.');
  });

  test('a valid reading passes', () => {
    expect(validate(ok, ['after_lunch'], DAY)).toBe('');
  });
});
