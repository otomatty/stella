public class Q07TimesTenTests
{
    [Theory(DisplayName = "Q07 1から N の10倍")]
    [InlineData(3, "10\n20\n30\n")]
    [InlineData(1, "10\n")]
    [InlineData(5, "10\n20\n30\n40\n50\n")]
    public void Q07TimesTen(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q07TimesTen(n)));
    }
}
