import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PurchaseCreatePage from '../../src/components/inventory/PurchaseCreatePage';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('PurchaseCreatePage UI', () => {
  it('disables item input until header is filled and supports inline minimal create', async () => {
    // Mock fetch behaviour
    const fetchMock = vi.fn((input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.endsWith('/api/suppliers')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'sup1', name: 'Supplier 1' }] } as any);
      }
      if (url.endsWith('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ([{ id: 'cat1', name: 'Kategori 1' }]) } as any);
      }
      if (url.endsWith('/api/inventory/minimal')) {
        return Promise.resolve({ ok: true, json: async () => ({ id: 'sp-new', code: 'NEW1', name: 'New Item', categoryId: 'cat1' }) } as any);
      }
      if (url.startsWith('/api/inventory?q=')) {
        return Promise.resolve({ ok: true, json: async () => ({ items: [] }) } as any);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });

    // @ts-ignore
    vi.stubGlobal('fetch', fetchMock);

    render(<PurchaseCreatePage />);

    // Initially, add item buttons disabled
    const tambahBtn = await screen.findByRole('button', { name: /Tambah Item/i });
    const addBlankBtn = await screen.findByRole('button', { name: /Add Blank Item/i });
    expect(tambahBtn).toBeDisabled();
    expect(addBlankBtn).toBeDisabled();

    // Fill header: date, select supplier, ref number
    const dateInput = screen.getByLabelText(/Tanggal Pembelian/i) as HTMLInputElement;
    const supplierInput = screen.getByPlaceholderText('-- Pilih Supplier --') as HTMLInputElement;
    const refInput = screen.getByLabelText(/Nomor Referensi/i) as HTMLInputElement;

    // set date
    fireEvent.change(dateInput, { target: { value: '2025-01-01' } });
    // type supplier and select
    await userEvent.type(supplierInput, 'Supplier 1');
    // options dropdown appears; click the option
    await waitFor(() => expect(screen.queryByText('Supplier 1')).toBeInTheDocument());
    const opt = screen.getByText('Supplier 1');
    fireEvent.mouseDown(opt);

    fireEvent.change(refInput, { target: { value: 'REF123' } });

    // now buttons should be enabled
    await waitFor(() => expect(tambahBtn).toBeEnabled());
    await waitFor(() => expect(addBlankBtn).toBeEnabled());

    // add a blank item and assert category isn't shown for blank rows
    fireEvent.click(addBlankBtn);
    expect(screen.queryByPlaceholderText('-- Pilih Kategori --')).not.toBeInTheDocument();

    // Click tambah item to open inline create
    fireEvent.click(tambahBtn);
    // fill new item fields
    const codeInput = screen.getByPlaceholderText('Kode');
    const nameInput = screen.getByPlaceholderText('Nama');
    await userEvent.type(codeInput, 'NEW1');
    await userEvent.type(nameInput, 'New Item');

    // select category
    const catInput = screen.getByPlaceholderText('Pilih Kategori');
    await userEvent.type(catInput, 'Kategori 1');
    await waitFor(() => expect(screen.getByText('Kategori 1')).toBeInTheDocument());
    const catOpt = screen.getByText('Kategori 1');
    fireEvent.mouseDown(catOpt);

    // submit create
    const buatBtn = screen.getByRole('button', { name: /Buat & Tambah|Buat & Tambah/i });
    fireEvent.click(buatBtn);

    // After creation, Item #1 should appear with prefilled code/name and category
    await waitFor(() => expect(screen.getByText('Item #1')).toBeInTheDocument());
    expect((screen.getByLabelText('Kode Barang') as HTMLInputElement).value).toMatch(/NEW1|NEW1/);
    expect((screen.getByLabelText('Nama Barang') as HTMLInputElement).value).toMatch(/New Item/);
    // category should be applied to the row
    expect(screen.getByDisplayValue('Kategori 1')).toBeInTheDocument();
  });
});