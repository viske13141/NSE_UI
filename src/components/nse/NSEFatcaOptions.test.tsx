import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import NSEFatcaDataUpload from './NSEFatcaDataUpload';
import NSEFatcaCommonUpload from './NSEFatcaCommonUpload';

afterEach(cleanup);
it('uses the extended FATCA occupation list and repeats country/identity choices for added tax residences', () => {
  render(<NSEFatcaDataUpload />);
  fireEvent.click(screen.getByText('Submit individual FATCA data'));
  expect(within(screen.getByLabelText('Occupation')).getByRole('option', { name: 'DOCTOR (09)' })).toHaveValue('09');
  fireEvent.change(screen.getByLabelText('Country of birth'), { target: { value: 'IN' } });
  expect(screen.getByLabelText('Country of birth')).toHaveValue('IN');
  fireEvent.click(screen.getByRole('button', { name: 'Add another tax residence' }));
  expect(within(screen.getAllByLabelText('Tax residence country')[1]).getByRole('option', { name: 'UNITED STATES (US)' })).toHaveValue('US');
  expect(screen.getAllByLabelText('Identification document type')).toHaveLength(2);
});
it('provides documented entity and UBO dropdowns without inventing the missing NFE master', () => {
  render(<NSEFatcaCommonUpload />);
  fireEvent.click(screen.getByText(/Submit common FATCA/));
  expect(screen.getByLabelText('Exemption code')).toHaveProperty('tagName', 'SELECT');
  expect(screen.getByLabelText('NFE category code')).toHaveProperty('tagName', 'INPUT');
  fireEvent.change(screen.getByLabelText('UBO applicable'), { target: { value: 'Y' } });
  const ubo = screen.getByRole('group', { name: 'UBO 1' });
  expect(within(ubo).getByLabelText('State')).toHaveProperty('tagName', 'SELECT');
  expect(within(within(ubo).getByLabelText('State')).getByRole('option', { name: 'BIHAR (BR)' })).toHaveValue('BR');
});

it('shows NPO declaration and registration only when applicable', () => {
  render(<NSEFatcaDataUpload embedded />);
  expect(screen.queryByLabelText('NPO declaration')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('NPO form applicable'), { target: { value: 'Y' } });
  expect(screen.getByLabelText('NPO declaration')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('NPO declaration'), { target: { value: 'Y' } });
  expect(screen.getByLabelText('NPO registration number')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('NPO form applicable'), { target: { value: 'N' } });
  expect(screen.queryByLabelText('NPO registration number')).not.toBeInTheDocument();
  expect(screen.getByLabelText('PAN-exempt KYC reference number (PEKRN)')).toBeInTheDocument();
  expect(screen.getByLabelText('Declaration action (optional)')).toBeInTheDocument();
});

it('fills the documented occupation type and clears a removed tax residence', () => {
  render(<NSEFatcaDataUpload embedded />);
  fireEvent.change(screen.getByLabelText('Occupation'), { target: { value: '44' } });
  expect(screen.getByLabelText('Occupation type')).toHaveValue('S');
  fireEvent.change(screen.getByLabelText('Occupation'), { target: { value: '01' } });
  expect(screen.getByLabelText('Occupation type')).toHaveValue('B');
  fireEvent.click(screen.getByRole('button', { name: 'Add another tax residence' }));
  fireEvent.change(screen.getAllByLabelText('Tax residence country')[1], { target: { value: 'US' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remove tax residence 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add another tax residence' }));
  expect(screen.getAllByLabelText('Tax residence country')[1]).toHaveValue('');
});
