public class Q24PrintLeft2Right2Tests
{
    [Fact(DisplayName = "Q24 左2・右2")]
    public void Q24PrintLeft2Right2()
    {
        Assert.Equal("20\n26\n", ConsoleOutput.Capture(() => Answers.Q24PrintLeft2Right2("2026")));
        Assert.Equal("ab\ncd\n", ConsoleOutput.Capture(() => Answers.Q24PrintLeft2Right2("abcd")));
        Assert.Equal("ab\nef\n", ConsoleOutput.Capture(() => Answers.Q24PrintLeft2Right2("abcdef")));
    }
}
