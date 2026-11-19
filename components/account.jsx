'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { maxPasswordLength, minPasswordLength, newPasswordHint, newPasswordPattern } from '../lib/password-policy.mjs';
import { ActionForm, Icon } from './client.jsx';
import { AddressFields } from './address-fields.jsx';

function PasswordField({ creating }) {
  const id = useId();
  const hintId = id + '-hint';
  const [visible, setVisible] = useState(false);
  return <div className="password-field">
    <label htmlFor={id}>Kata sandi</label>
    <div className="password-control">
      <input id={id} name="password" type={visible ? 'text' : 'password'} required
        autoComplete={creating ? 'new-password' : 'current-password'}
        autoCapitalize="none" spellCheck={false}
        minLength={minPasswordLength} maxLength={creating ? maxPasswordLength : 128}
        pattern={creating ? newPasswordPattern : undefined} title={creating ? newPasswordHint : undefined}
        aria-describedby={creating ? hintId : undefined}/>
      <button className="icon password-toggle" type="button" aria-controls={id}
        aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        onClick={() => setVisible((previous) => !previous)}>
        <Icon name={visible ? 'eyeOff' : 'eye'} />
      </button>
    </div>
    {creating && <p id={hintId} className="password-hint">{newPasswordHint}</p>}
  </div>;
}

export function Login({ mode, reset, checkout }) {
  const register = mode === 'register';
  const recovery = mode === 'forgot';
  const next = checkout ? '/checkout' : '/account';
  return <div className="panel narrow">
    <h1>{reset ? 'Kata sandi baru' : recovery ? 'Lupa kata sandi' : register ? 'Buat akun' : 'Masuk'}</h1>
    <ActionForm key={mode + reset} navigate={recovery ? undefined : next} action={reset ? 'account.new-password' : recovery ? 'account.reset' : register ? 'account.register' : 'account.login'}>
      {register && <label>Nama<input name="name" autoComplete="name" required maxLength={100}/></label>}
      {!reset && <label>Email<input type="email" name="email" autoComplete="email" required/></label>}
      {reset && <input type="hidden" name="code" value={reset}/>}
      {!recovery && <PasswordField creating={!!reset || register}/>}
      <button className="button wide" type="submit">{reset ? 'Simpan kata sandi' : recovery ? 'Kirim tautan pemulihan' : register ? 'Daftar' : 'Masuk'}</button>
    </ActionForm>
    <div className="cluster">
      {register || recovery || reset ? <Link href={checkout ? '/account?checkout=1' : '/account'}>Kembali ke login</Link>
        : <><Link href={'/account?mode=register' + (checkout ? '&checkout=1' : '')}>Daftar akun</Link><Link href="/account?mode=forgot">Lupa kata sandi?</Link></>}
    </div>
  </div>;
}

export function Profile({ user, addresses }) {
  const [addressForm, setAddressForm] = useState(0);
  return <div className="two-column">
    <section className="panel"><h2>Profil</h2>
      <ActionForm action="account.profile"><label>Nama<input name="name" defaultValue={user.name} required maxLength={100} autoComplete="name"/></label>
        <label>Email<input defaultValue={user.email} readOnly/></label><label>Nomor WhatsApp<input name="phone" type="tel" defaultValue={user.phone} autoComplete="tel" maxLength={24}/></label>
        <button className="button" type="submit">Simpan profil</button>
      </ActionForm>
      <div className="cluster"><Link className="text-link" href="/orders">Riwayat pesanan</Link>{user.role === 'admin' && <Link className="text-link" href="/admin">Dashboard admin</Link>}
        <ActionForm action="account.logout"><button className="plain" type="submit">Keluar</button></ActionForm>
      </div>
    </section>
    <section className="panel"><h2>Buku alamat</h2>
      {addresses.map(({ id, details }) => <details key={id}><summary>{details.name} · {details.city}</summary>
        <ActionForm action="account.address"><input type="hidden" name="id" value={id}/><AddressFields value={details}/><button className="button secondary" type="submit">Simpan perubahan</button></ActionForm>
        <ActionForm action="account.address-delete"><input type="hidden" name="id" value={id}/><button className="plain" type="submit">Hapus alamat</button></ActionForm></details>)}
      <details><summary>Tambah alamat</summary><ActionForm action="account.address" onSuccess={() => setAddressForm((version) => version + 1)}><AddressFields key={addressForm}/><button className="button" type="submit">Simpan alamat</button></ActionForm></details>
    </section>
  </div>;
}
