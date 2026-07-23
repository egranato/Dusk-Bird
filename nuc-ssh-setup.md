# Set up SSH access on the NUC

Run these on the NUC itself, in an elevated PowerShell window (right-click Start > "Terminal (Admin)" or "Windows PowerShell (Admin)").

## 1. Install the OpenSSH Server feature

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
```

If it says the capability is already installed, skip to step 2.

## 2. Start the service and set it to auto-start on boot

```powershell
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
```

## 3. Confirm the firewall rule exists

Installing the feature should create this automatically, but confirm it:

```powershell
Get-NetFirewallRule -Name *ssh* | Select-Object Name, DisplayName, Enabled, Direction, Profile
```

You should see a rule named `OpenSSH-Server-In-TCP` with `Enabled: True`.

## 4. Make both SSH and RDP firewall rules survive a network profile change

This is the fix for the RDP issue you just hit — a rule scoped to "Private" only stops working if Windows reclassifies the network as "Public" (e.g. after a reboot or driver update). Set both to apply on any profile:

```powershell
Set-NetFirewallRule -Name OpenSSH-Server-In-TCP -Profile Any
Set-NetFirewallRule -DisplayGroup "Remote Desktop" -Profile Any
```

## 5. Test it from another machine on the LAN

From your regular PC (not the NUC):

```powershell
ssh <your-windows-username>@192.168.0.137
```

Replace `<your-windows-username>` with your Windows account name on the NUC. First connection will ask you to confirm the host key fingerprint — type `yes`.
