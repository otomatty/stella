public class Q07MultipleOf3Tests
{
    [Theory(DisplayName = "Q07 3の倍数")]
    [InlineData(9, "Yes")]
    [InlineData(10, "No")]
    [InlineData(0, "Yes")]
    public void Q07MultipleOf3(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q07MultipleOf3(n));
    }
}
