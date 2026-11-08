public class Q21PrintYmdTests
{
    [Fact(DisplayName = "Q21 年・月・日")]
    public void Q21PrintYmd()
    {
        Assert.Equal("2026\n09\n03\n", ConsoleOutput.Capture(() => Answers.Q21PrintYmd("20260903")));
        Assert.Equal("1999\n12\n31\n", ConsoleOutput.Capture(() => Answers.Q21PrintYmd("19991231")));
    }
}
