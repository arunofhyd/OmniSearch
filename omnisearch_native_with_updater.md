# OmniSearch Native Logic (With Auto-Updater)

This script includes all the safety features of the standard version but adds an **Automatic Update Checker**.
**Status:** Pending IT Permission. Use this only when authorized.

## Features
1.  **Auto-Update**: Checks `omniisearch.netlify.app/version.txt` for updates.
2.  **Window Sizing**: Supports "fullscreen", "left", "right", "top", "bottom", "center", or "custom".
3.  **Configurable Frequency**: "always", "daily", or "weekly".
4.  **Tab Safety**: Uses the same safe "Tab 1" logic.

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
	
	-- If you chose "custom" above, set your coordinates here {Left, Top, Right, Bottom}:
	set customBounds to {100, 100, 1200, 800}
	
	-- Set to 'true' to bring Safari to front, 'false' to update in background
	set alwaysFocus to true
	
	-- Update Settings:
	-- "always" (check every run - best for testing)
	-- "daily"  (standard production setting)
	-- "weekly" (minimum intrusion)
	set updateFrequency to "always"
	-- ==========================================
	
	-- 3. AUTO-UPDATE CHECK:
	-- This block handles silent background version checks against the hosted version.txt
	set currentVersion to 1.1
	set dateCache to "/tmp/omnisearch_lastcheck.txt"
	set todayDate to (current date)
	set todayDateString to short date string of todayDate
	
	-- Retrieve ISO week identifier using shell for "weekly" frequency support
	set weekIdentifier to do shell script "date +%G-W%V"
	
	set shouldCheck to false
	
	if updateFrequency is "always" then
		set shouldCheck to true
	else
		try
			set lastCheckSignature to do shell script "cat " & quoted form of dateCache
			if updateFrequency is "daily" then
				if lastCheckSignature is not equal to todayDateString then set shouldCheck to true
			else if updateFrequency is "weekly" then
				if lastCheckSignature is not equal to weekIdentifier then set shouldCheck to true
			end if
		on error
			set shouldCheck to true
		end try
	end if
	
	if shouldCheck then
		try
			-- Pinging the server with a 2-second timeout.
			-- We use 'awk' to extract just the first word (version number) from the first line of the new multi-line format.
			set remoteVersionString to do shell script "curl -s --max-time 2 https://omniisearch.netlify.app/version.txt | head -n 1 | awk '{print $1}'"
			
			if remoteVersionString is not "" then
				-- Handle decimal points safely across different system locales
				set oldDelims to AppleScript's text item delimiters
				set AppleScript's text item delimiters to "."
				set remotePieces to text items of remoteVersionString
				set AppleScript's text item delimiters to (character 2 of (0.5 as string))
				set localizedRemoteVersionString to remotePieces as string
				set AppleScript's text item delimiters to oldDelims
				
				set remoteVersion to localizedRemoteVersionString as real
				
				-- Compare versions
				if remoteVersion > currentVersion then
					-- Force the dialog to the absolute frontmost layer
					tell application (path to frontmost application as text)
						set dialogResult to display dialog "A new version of Omni Search (v" & remoteVersionString & ") is available!" & return & return & "You are currently running v" & currentVersion & ". Would you like to download the update?" with title "Omni Search Update" buttons {"Skip for now", "Open Website"} default button "Open Website"
						
						if button returned of dialogResult is "Open Website" then
							-- Get Safari PID safely
							tell application "System Events"
								set currentSafariPID to unix id of process "Safari" as text
							end tell
							
							-- Get Cache data to check if we can reuse the window
							set cacheFile to "/tmp/omnisearch_id.txt"
							set storedPID to ""
							set storedID to 0
							try
								set cachedData to do shell script "cat " & quoted form of cacheFile
								set oldDelims to AppleScript's text item delimiters
								set AppleScript's text item delimiters to ","
								set storedPID to text item 1 of cachedData
								set storedID to (text item 2 of cachedData) as integer
								set AppleScript's text item delimiters to oldDelims
							end try
							
							tell application "Safari"
								set updateTargetFound to false
								
								-- Specific check to see if OmniSearch window is open to prevent work loss
								if (storedPID is equal to currentSafariPID) and (storedID is not 0) then
									try
										if exists window id storedID then
											tell window id storedID
												set URL of tab 1 to "https://omniisearch.netlify.app"
												set index to 1
												set updateTargetFound to true
											end tell
										end if
									end try
								end if
								
								-- If no OmniSearch window, open a NEW window to protect active tabs
								if not updateTargetFound then
									make new document with properties {URL:"https://omniisearch.netlify.app"}
								end if
								activate
							end tell
							return input
						end if
					end tell
				end if
				
				-- Update cache signature based on current frequency
				if updateFrequency is "daily" then
					do shell script "echo " & quoted form of todayDateString & " > " & quoted form of dateCache
				else if updateFrequency is "weekly" then
					do shell script "echo " & quoted form of weekIdentifier & " > " & quoted form of dateCache
				end if
			end if
		on error
			-- Silent fail on network error to allow search to proceed
		end try
	end if
	
	-- 4. CLEAN THE LINK:
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
	
	-- 5. PREPARE MEMORY:
	-- The script uses a tiny file to remember which Safari window it used last.
	set cacheFile to "/tmp/omnisearch_id.txt"
	set foundWindow to false
	set storedPID to ""
	set storedID to 0
	
	try
		set cachedData to do shell script "cat " & quoted form of cacheFile
		set oldDelims to AppleScript's text item delimiters
		set AppleScript's text item delimiters to ","
		set storedPID to text item 1 of cachedData
		set storedID to (text item 2 of cachedData) as integer
		set AppleScript's text item delimiters to oldDelims
	on error
		-- No saved window found? No problem, we'll create one later.
	end try
	
	-- 6. CHECK IF SAFARI IS OPEN:
	-- This is a quick "pro" check to see if Safari is actually running.
	tell application "System Events" to set safariRunning to exists process "Safari"
	
	-- If Safari is closed, wake it up now. If it's running, we'll activate it LATER
	-- to prevent macOS from mistakenly switching to a fullscreen window.
	if (safariRunning is false) then
		tell application "Safari" to activate
	end if
	
	tell application "System Events" to set currentPID to unix id of process "Safari" as text
	
	tell application "Safari"
		-- 7. TRY TO REUSE THE LAST WINDOW:
		-- If the saved window still exists, load the new link there.
		if (storedPID is equal to currentPID) then
			try
				if exists window id storedID then
					tell window id storedID
						set foundWindow to true
						if (count of tabs) > 0 then
							set URL of tab 1 to targetURL
							set current tab to tab 1
						else
							make new tab at end of tabs with properties {URL:targetURL}
						end if
						
						-- Pull window out of the dock if it was minimized.
						if alwaysFocus is true then
							set visible to true
							set minimized to false
							set index to 1
							tell application "Safari" to activate
						end if
					end tell
				end if
			on error
				set foundWindow to false
			end try
		end if
		
		-- 8. CREATE & SIZE THE WINDOW:
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
				
				-- Save this window's identity so we can find it next time.
				set newID to (get id of window 1)
				do shell script "echo " & quoted form of (currentPID & "," & (newID as string)) & " > " & quoted form of cacheFile
			end try
		end if
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
