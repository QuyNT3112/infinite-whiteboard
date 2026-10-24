using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace WhiteboardLauncher
{
    static class Program
    {
        private static Process serverProcess = null;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string nodePath = FindNodeExecutable();

            if (string.IsNullOrEmpty(nodePath))
            {
                MessageBox.Show(
                    "Node.js was not found on your system.\n\nPlease install Node.js from https://nodejs.org or check your installation.",
                    "Node.js Required",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Check if dist folder exists; if not, build it or use dev server
            string distIndex = Path.Combine(appDir, "dist", "index.html");
            string serverScript = Path.Combine(appDir, "server.cjs");

            try
            {
                ProcessStartInfo psi;

                if (File.Exists(serverScript) && File.Exists(distIndex))
                {
                    // Fast production server
                    psi = new ProcessStartInfo
                    {
                        FileName = nodePath,
                        Arguments = "\"" + serverScript + "\"",
                        WorkingDirectory = appDir,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                }
                else
                {
                    // Fallback to npm run dev
                    string npmCmd = FindNpmCmd(nodePath);
                    psi = new ProcessStartInfo
                    {
                        FileName = npmCmd,
                        Arguments = "run dev -- --host 127.0.0.1 --port 5173",
                        WorkingDirectory = appDir,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                }

                serverProcess = Process.Start(psi);

                // Wait 1 second then open default web browser
                new Thread(() =>
                {
                    Thread.Sleep(1200);
                    try
                    {
                        Process.Start(new ProcessStartInfo("http://localhost:5173/") { UseShellExecute = true });
                    }
                    catch { }
                }).Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to start Whiteboard server:\n" + ex.Message,
                    "Startup Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Minimal, clean status control window
            Form statusForm = new Form
            {
                Text = "Microsoft Whiteboard - Infinite Canvas",
                Size = new Size(420, 230),
                StartPosition = FormStartPosition.CenterScreen,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                BackColor = Color.FromArgb(248, 250, 252)
            };

            Label titleLabel = new Label
            {
                Text = "Whiteboard Server is Running",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                ForeColor = Color.FromArgb(15, 23, 42),
                Location = new Point(24, 20),
                AutoSize = true
            };

            Label descLabel = new Label
            {
                Text = "Address: http://localhost:5173/\nApplication opened in your web browser.\nKeep this window open while using the whiteboard.",
                Font = new Font("Segoe UI", 9.5f),
                ForeColor = Color.FromArgb(71, 85, 105),
                Location = new Point(24, 52),
                Size = new Size(355, 60)
            };

            Button openBtn = new Button
            {
                Text = "Open in Browser",
                Location = new Point(24, 125),
                Size = new Size(160, 38),
                BackColor = Color.FromArgb(37, 99, 235),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            openBtn.FlatAppearance.BorderSize = 0;
            openBtn.Click += (s, e) =>
            {
                try
                {
                    Process.Start(new ProcessStartInfo("http://localhost:5173/") { UseShellExecute = true });
                }
                catch { }
            };

            Button exitBtn = new Button
            {
                Text = "Stop & Exit",
                Location = new Point(210, 125),
                Size = new Size(165, 38),
                BackColor = Color.FromArgb(226, 232, 240),
                ForeColor = Color.FromArgb(30, 41, 59),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            exitBtn.FlatAppearance.BorderSize = 0;
            exitBtn.Click += (s, e) => statusForm.Close();

            statusForm.Controls.Add(titleLabel);
            statusForm.Controls.Add(descLabel);
            statusForm.Controls.Add(openBtn);
            statusForm.Controls.Add(exitBtn);

            statusForm.FormClosing += (s, e) =>
            {
                CleanupServer();
            };

            Application.Run(statusForm);
        }

        private static string FindNodeExecutable()
        {
            string[] searchPaths = new string[]
            {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                @"D:\NODEJS\node.exe",
                @"E:\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "AppData", "Roaming", "npm", "node.exe")
            };

            foreach (string path in searchPaths)
            {
                if (File.Exists(path)) return path;
            }

            // Check PATH
            string pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                foreach (string dir in pathEnv.Split(';'))
                {
                    string candidate = Path.Combine(dir.Trim(), "node.exe");
                    if (File.Exists(candidate)) return candidate;
                }
            }

            return null;
        }

        private static string FindNpmCmd(string nodePath)
        {
            if (!string.IsNullOrEmpty(nodePath))
            {
                string dir = Path.GetDirectoryName(nodePath);
                string npmCmd = Path.Combine(dir, "npm.cmd");
                if (File.Exists(npmCmd)) return npmCmd;
            }
            return "npm.cmd";
        }

        private static void CleanupServer()
        {
            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                    serverProcess.Dispose();
                    serverProcess = null;
                }
            }
            catch { }
        }
    }
}
