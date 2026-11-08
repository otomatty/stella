public class S07RepeatWordTests
{
    [Theory(DisplayName = "S07 案内を繰り返す")]
    [InlineData("go", 3, "go\ngo\ngo\n")]
    [InlineData("go", 0, "")]
    [InlineData("go", 1, "go\n")]
    [InlineData("hi", 2, "hi\nhi\n")]
    public void S07RepeatWord(string word, int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.S07RepeatWord(word, n)));
    }
}
