import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { ConnectionActivity } from '../components/ConnectionActivity';
const props = { apiBase: '/api/agentadmit', authToken: 'user-jwt', connectionId: 'conn_1' };
const event = { id:'one', timestamp:'2026-09-20T00:00:00Z', scope:'read:workouts', label:'Read workouts', decision:'allowed' };
const body = (extra = {}) => ({connection_id:'conn_1',window_days:30,events:[event],next_cursor:null,...extra});
const response = (data: unknown) => ({ok:true,json:async()=>data} as Response);
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('ConnectionActivity',()=>{
  it('loads on demand, safely renders labels and pages without claiming completed actions',async()=>{
    const fetch = vi.fn().mockResolvedValueOnce(response(body({next_cursor:'next'}))).mockResolvedValueOnce(response(body({events:[{...event,id:'two',label:'<img src=x onerror=alert(1)>',decision:'denied'}]})));
    vi.stubGlobal('fetch',fetch);
    const {container}=render(<ConnectionActivity {...props}/>);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Activity'));
    expect(await screen.findByText('Permission check passed')).toBeTruthy();
    expect(screen.getByText(/does not prove an action completed/)).toBeTruthy();
    expect(fetch.mock.calls[0][0]).toBe('/api/agentadmit/connections/conn_1/activity?limit=20');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer user-jwt');
    fireEvent.click(screen.getByText('Next page'));
    expect(await screen.findByText('Permission denied')).toBeTruthy();
    expect(fetch.mock.calls[1][0]).toContain('cursor=next');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText('Read workouts')).toBeNull();
  });
  it('does not misrepresent a failed read as empty, and retries without exposing upstream error text',async()=>{
    const fetch=vi.fn().mockResolvedValueOnce({ok:false,json:async()=>({secret:'SENSITIVE'})}).mockResolvedValueOnce(response(body({events:[]})));
    vi.stubGlobal('fetch',fetch);render(<ConnectionActivity {...props}/>);
    fireEvent.click(screen.getByText('Activity'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/No recorded checks/)).toBeNull();
    expect(screen.queryByText('SENSITIVE')).toBeNull();
    fireEvent.click(screen.getByText('Retry'));
    expect(await screen.findByText(/No recorded checks/)).toBeTruthy();
  });
  it('drops cached history immediately when the signed-in user changes',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(body())));
    const {rerender}=render(<ConnectionActivity {...props}/>);
    fireEvent.click(screen.getByText('Activity'));await screen.findByText('Read workouts');
    rerender(<ConnectionActivity {...props} authToken="other-user"/>);
    expect(screen.queryByText('Read workouts')).toBeNull();
    expect(screen.getByText('Activity').getAttribute('aria-expanded')).toBe('false');
  });
  it('aborts on connection switch and ignores an old response even if fetch resolves after abort',async()=>{
    let resolve!: (res: Response)=>void;
    const fetch=vi.fn().mockImplementation(()=>new Promise(r=>{resolve=r;}));vi.stubGlobal('fetch',fetch);
    const {rerender}=render(<ConnectionActivity {...props}/>);
    fireEvent.click(screen.getByText('Activity'));
    await waitFor(()=>expect(fetch).toHaveBeenCalledOnce());
    const signal=fetch.mock.calls[0][1].signal;
    rerender(<ConnectionActivity {...props} connectionId="conn_other"/>);
    expect(signal.aborted).toBe(true);
    await act(async()=>resolve(response(body())));
    expect(screen.queryByText('Read workouts')).toBeNull();
  });
  it('rejects mismatched ownership in the display contract',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(body({connection_id:'other'}))));
    render(<ConnectionActivity {...props}/>);fireEvent.click(screen.getByText('Activity'));
    await screen.findByRole('alert');expect(screen.queryByText('Read workouts')).toBeNull();
  });
});
