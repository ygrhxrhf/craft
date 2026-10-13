#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.unminimize();
      }
    }))
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      None,
    ))
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // 托盘：关窗最小化到托盘可关 + 菜单（P0）
      let show_item = tauri::menu::MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
      let new_doc_item = tauri::menu::MenuItem::with_id(app, "new_doc", "新建文档", true, None::<&str>)?;
      let quit_item = tauri::menu::MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
      let menu = tauri::menu::Menu::with_items(app, &[&show_item, &new_doc_item, &quit_item])?;
      let _tray = tauri::tray::TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().unwrap())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "new_doc" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.emit("tauri://new-doc", ());
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
        })
        .build(app)?;

      // 全局快捷键 Ctrl+Alt+C 显隐（P0）
      #[cfg(desktop)]
      {
        use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
        let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyC);
        let app_handle = app.handle().clone();
        let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
          if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            if let Some(window) = app_handle.get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
        });
      }

      // 关窗最小化到托盘（设置可关，默认启用；设置面板可通过窗口事件控制）
      if let Some(window) = app.get_webview_window("main") {
        let window_clone = window.clone();
        window.on_window_event(move |event| {
          if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            // 默认最小化到托盘而非退出
            api.prevent_close();
            let _ = window_clone.hide();
          }
        });
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
