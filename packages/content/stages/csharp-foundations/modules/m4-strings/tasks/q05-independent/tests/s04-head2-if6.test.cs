public class S04Head2If6Tests
{
    [Fact(DisplayName = "S04 受付番号の前半")]
    public void S04Head2If6()
    {
        Assert.Equal("00", Answers.S04Head2If6("001234"));
        Assert.Equal("Err", Answers.S04Head2If6("123"));
        Assert.Equal("Err", Answers.S04Head2If6(""));
        Assert.Equal("Err", Answers.S04Head2If6("1234567"));
        Assert.Equal("ab", Answers.S04Head2If6("abcdef"));
    }
}
