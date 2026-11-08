public class Q03IsMultipleOf3Tests
{
    [Fact(DisplayName = "Q03 3の倍数か")]
    public void Q03IsMultipleOf3()
    {
        Assert.Equal(true, Answers.Q03IsMultipleOf3(9));
        Assert.Equal(false, Answers.Q03IsMultipleOf3(10));
        Assert.Equal(true, Answers.Q03IsMultipleOf3(0));
    }
}
