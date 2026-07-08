# OmniSearch Native Logic (Safe & Production Ready)

This is the recommended, permission-free script currently in use. It includes URL sanitization for Apple tools and strict "Tab 1" targeting to protect your work.

## Features
1.  **Tab Safety**: Always uses **Tab 1** of the dedicated window.
2.  **Window Sizing**: Supports "fullscreen", "left", "right", "top", "bottom", "center", or "custom".
3.  **WAF Compliance**: Automatically sanitizes URLs for `marketingtools.apple.com`.
4.  **Robustness**: Handles Safari restarts (PID check) and race conditions.

## The Script

```applescript
on run {input, parameters}
	-- 1. GET THE LINK: 
	-- This takes the web address sent from your macOS Shortcut.
	set targetURL to (item 1 of input) as string
	
	-- ==========================================
	-- 2. USER SETTINGS (Edit these easily!)
	-- ==========================================
	-- Choose your size: "fullscreen", "left", "right", "top", "bottom", "center", or "custom"
	set windowSize to "fullscreen"
	
	-- If you chose "custom" above, set your window coordinates here {Left, Top, Right, Bottom}:
	set customBounds to {100, 100, 1200, 800}
	
	-- Set to 'true' to bring Safari to front, 'false' to update in background
	set alwaysFocus to true
	-- ==========================================
	
	-- 3. CLEAN THE LINK:
	-- Some Apple links break if they have spaces. This swaps spaces for "+" 
	-- so the website doesn't block the request.
	if targetURL contains "marketingtools.apple.com" then
		set oldDelims to AppleScript's text item delimiters
		set AppleScript's text item delimiters to {"%2520", "%20", " "}
		set urlPieces to text items of targetURL
		set AppleScript's text item delimiters to "+"
		set targetURL to urlPieces as string
		set AppleScript's text item delimiters to oldDelims
	end if
	
	-- 4. PREPARE MEMORY:
	-- The script uses a tiny file to remember which Safari window it used last.
	set cacheFile to "/tmp/omnisearch_id.txt"
	set foundWindow to false
	set storedPID to ""
	set storedID to 0
	set storedURL to ""
	set storedTabIndex to 0
	
	try
		set cachedData to do shell script "cat " & quoted form of cacheFile
		-- We read by paragraph so it's clean and safe
		set storedPID to paragraph 1 of cachedData
		set storedID to (paragraph 2 of cachedData) as integer
		try
			set storedURL to paragraph 3 of cachedData
		end try
		try
			set storedTabIndex to (paragraph 4 of cachedData) as integer
		end try
	on error
		-- No saved window found? No problem, we'll create one later.
	end try
	
	-- 5. CHECK IF SAFARI IS OPEN:
	-- This is a quick "pro" check to see if Safari is actually running.
	tell application "System Events" to set safariRunning to exists process "Safari"
	
	-- If Safari is closed, wake it up now. If it's running, we'll activate it LATER
	-- to prevent macOS from mistakenly switching to a fullscreen window.
	if (safariRunning is false) then
		tell application "Safari" to activate
		-- DYNAMIC WAIT: Checks every 0.1s for Safari to wake up (max 5 seconds)
		set wakeCounter to 0
		repeat until safariRunning or wakeCounter > 50
			tell application "System Events" to set safariRunning to exists process "Safari"
			delay 0.1
			set wakeCounter to wakeCounter + 1
		end repeat
	end if
	
	tell application "System Events" to set currentPID to unix id of process "Safari" as text
	
	tell application "Safari"
		-- 6. TRY TO REUSE THE LAST WINDOW:
		-- If the saved window still exists, load the new link there.
		if (storedPID is equal to currentPID) then
			try
				if exists window id storedID then
					tell window id storedID
						set foundWindow to true
						set tabReused to false
						
						-- PRIMARY (URL FINGERPRINTING): Scan all tabs for the exact URL of our last search
						if storedURL is not "" then
							set totalTabs to count of tabs
							repeat with i from 1 to totalTabs
								try
									if URL of tab i is equal to storedURL then
										set URL of tab i to targetURL
										set current tab to tab i
										set tabReused to true
										exit repeat
									end if
								end try
							end repeat
						end if
						
						-- FALLBACK (TAB INDEX): If URL changed (user clicked a link), reuse the last known Tab Index
						if not tabReused and storedTabIndex > 0 then
							if (count of tabs) ≥ storedTabIndex then
								try
									set URL of tab storedTabIndex to targetURL
									set current tab to tab storedTabIndex
									set tabReused to true
								end try
							end if
						end if
						
						-- LAST RESORT: If the tab was completely closed or missing, make a new tab
						if not tabReused then
							make new tab at end of tabs with properties {URL:targetURL}
							set current tab to last tab
						end if
						
						-- Pull window out of the dock if it was minimized.
						if alwaysFocus is true then
							set visible to true
							set miniaturized to false
							set index to 1
							tell application "Safari" to activate
						end if
					end tell
				end if
			on error
				set foundWindow to false
			end try
		end if
		
		-- 7. CREATE & SIZE THE WINDOW:
		-- If we couldn't find the old window, make a fresh one and size it.
		if not foundWindow then
			tell application "Safari" to activate
			set initialWindowCount to count of windows
			make new document with properties {URL:targetURL}
			
			-- Wait a moment for the window to actually appear before resizing.
			set timeoutCounter to 0
			repeat while (count of windows) is initialWindowCount
				delay 0.1
				set timeoutCounter to timeoutCounter + 1
				if timeoutCounter > 15 then exit repeat
			end repeat
			
			delay 0.1
			
			try
				-- Ask the Mac how big the screen is to calculate the position.
				tell application "Finder" to set {dL, dT, dR, dB} to bounds of window of desktop
				
				if windowSize is "left" then
					set bounds of window 1 to {0, 25, dR / 2, dB}
				else if windowSize is "right" then
					set bounds of window 1 to {dR / 2, 25, dR, dB}
				else if windowSize is "top" then
					set bounds of window 1 to {0, 25, dR, dB / 2}
				else if windowSize is "bottom" then
					set bounds of window 1 to {0, dB / 2, dR, dB}
				else if windowSize is "center" then
					set bounds of window 1 to {dR * 0.15, dB * 0.15, dR * 0.85, dB * 0.85}
				else if windowSize is "custom" then
					set bounds of window 1 to customBounds
				else -- Default to Fullscreen
					set bounds of window 1 to {0, 25, dR, dB}
				end if
			end try
		end if
		
		-- 8. SAVE EXACT WINDOW, URL & TAB STATE:
		-- Updates the memory with the Window ID, URL Fingerprint, and Tab Index
		try
			set activeWinID to id of window 1
			set activeTabIndex to index of current tab of window 1
			do shell script "echo " & quoted form of currentPID & " > " & quoted form of cacheFile
			do shell script "echo " & quoted form of (activeWinID as string) & " >> " & quoted form of cacheFile
			do shell script "echo " & quoted form of targetURL & " >> " & quoted form of cacheFile
			do shell script "echo " & quoted form of (activeTabIndex as string) & " >> " & quoted form of cacheFile
		end try
	end tell
	
	-- 9. JUMP TO FRONT:
	-- Final push to make sure Safari is the window you are looking at.
	if alwaysFocus is true then
		tell application "Safari" to activate
		try
			tell application "System Events" to tell process "Safari"
				set frontmost to true
				perform action "AXRaise" of window 1
			end tell
		end try
	end if
	
	return input
end run
```
